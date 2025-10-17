import sharp from 'sharp';
import proj4 from 'proj4';
import geoTiffManager from './GeoTiffManager.js';
import { getTileBBoxWGS84, autoCorrectZoom } from '../utils/tileUtils.js';
import { extractBandMetadata } from '../utils/bandMetadata.js';
import { calculateSpectralIndex, getIndexDefinition } from '../utils/spectralIndices.js';
import { applyColorMap, applyColorMapWithPercentiles, getRecommendedColorMap, type ColorMapName } from '../utils/colorMaps.js';
import type { TileParams, TileOptions, SpectralIndexOptions } from '../types/index.js';
import type * as GeoTIFF from 'geotiff';

class TileService {
    private static readonly DEFAULT_TILE_SIZE = 256;

    private getGeoTiffBBoxWGS84(image: GeoTIFF.GeoTIFFImage): [number, number, number, number] {
        const geoKeys = image.getGeoKeys();
        const epsgCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey;
        
        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const width = image.getWidth();
        const height = image.getHeight();
        
        const minX = origin[0];
        const maxY = origin[1];
        const maxX = minX + (width * resolution[0]);
        const minY = maxY + (height * resolution[1]); 
        
        if (!epsgCode || epsgCode === 4326) {
            return [minX, minY, maxX, maxY];
        }
        
        const fromProj = `EPSG:${epsgCode}`;
        const toProj = 'EPSG:4326';
        
        const [west, south] = proj4(fromProj, toProj, [minX, minY]);
        const [east, north] = proj4(fromProj, toProj, [maxX, maxY]);
        
        return [west, south, east, north];
    }

    private reprojectBBox(
        bbox: [number, number, number, number],
        image: GeoTIFF.GeoTIFFImage
    ): [number, number, number, number] {
        const geoKeys = image.getGeoKeys();
        
        const epsgCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey;
        
        if (!epsgCode || epsgCode === 4326) {
            return bbox;
        }
        
        const fromProj = 'EPSG:4326'; 
        const toProj = `EPSG:${epsgCode}`; 
        
        const [west, south, east, north] = bbox;
        const [minX, minY] = proj4(fromProj, toProj, [west, south]);
        const [maxX, maxY] = proj4(fromProj, toProj, [east, north]);
        
        return [minX, minY, maxX, maxY];
    }

    private bboxToWindow(
        bbox: [number, number, number, number],
        image: GeoTIFF.GeoTIFFImage
    ): [number, number, number, number] | null {
        const [minX, minY, maxX, maxY] = bbox;
        const resolution = image.getResolution();
        const origin = image.getOrigin();
        const imgWidth = image.getWidth();
        const imgHeight = image.getHeight();
        
        const pixelMinX = Math.floor((minX - origin[0]) / resolution[0]);
        const pixelMaxX = Math.ceil((maxX - origin[0]) / resolution[0]);
        const pixelMinY = Math.floor((origin[1] - maxY) / Math.abs(resolution[1]));
        const pixelMaxY = Math.ceil((origin[1] - minY) / Math.abs(resolution[1]));
        
        if (pixelMinX >= imgWidth || pixelMaxX <= 0 || pixelMinY >= imgHeight || pixelMaxY <= 0) {
            return null; 
        }
        
        const clampedMinX = Math.max(0, pixelMinX);
        const clampedMaxX = Math.min(imgWidth, pixelMaxX);
        const clampedMinY = Math.max(0, pixelMinY);
        const clampedMaxY = Math.min(imgHeight, pixelMaxY);
        
        return [clampedMinX, clampedMinY, clampedMaxX, clampedMaxY];
    }

    public async generateRgbTile(
        tiffId: string,
        params: TileParams,
        options?: TileOptions
    ): Promise<Buffer> {
        let { z, x, y } = params;
        const tileSize = options?.size || TileService.DEFAULT_TILE_SIZE;

        const entry = await geoTiffManager.loadGeoTiff(tiffId);
        const { image } = entry;

        const geotiffBBoxWGS84 = this.getGeoTiffBBoxWGS84(image);
        
        const { zoom: correctedZoom, corrected } = autoCorrectZoom(x, y, z, geotiffBBoxWGS84);
        if (corrected) {
            z = correctedZoom;
            console.log(`[TileService] Using corrected zoom ${z} for tile request (original: ${params.z})`);
        }

        const bboxWGS84 = getTileBBoxWGS84(z, x, y);
        const bbox = this.reprojectBBox(bboxWGS84, image);

        const window = this.bboxToWindow(bbox, image);
        
        if (!window) {
            return this.createTransparentTile(tileSize);
        }

        const [windowMinX, windowMinY, windowMaxX, windowMaxY] = window;
        const windowWidth = windowMaxX - windowMinX;
        const windowHeight = windowMaxY - windowMinY;

        const rasters = await image.readRasters({
            window: window,
            samples: [0, 1, 2],
            interleave: true,
        });

        if (!rasters || rasters.length === 0) {
            return this.createTransparentTile(tileSize);
        }

        const rasterData = rasters as unknown as Uint8Array | Uint16Array | Float32Array;
        const pixelBuffer = Buffer.from(
            rasterData.buffer,
            rasterData.byteOffset,
            rasterData.byteLength
        );

        return this.encodeImage(pixelBuffer, windowWidth, windowHeight, tileSize, options);
    }

    public async generateVariTile(
        tiffId: string,
        params: TileParams,
        options?: TileOptions
    ): Promise<Buffer> {
        let { z, x, y } = params;
        const tileSize = options?.size || TileService.DEFAULT_TILE_SIZE;

        const entry = await geoTiffManager.loadGeoTiff(tiffId);
        const { image } = entry;

        const geotiffBBoxWGS84 = this.getGeoTiffBBoxWGS84(image);
        
        const { zoom: correctedZoom, corrected } = autoCorrectZoom(x, y, z, geotiffBBoxWGS84);
        if (corrected) {
            z = correctedZoom;
            console.log(`[TileService] Using corrected zoom ${z} for VARI tile request (original: ${params.z})`);
        }

        const bboxWGS84 = getTileBBoxWGS84(z, x, y);
        const bbox = this.reprojectBBox(bboxWGS84, image);

        const window = this.bboxToWindow(bbox, image);
        
        if (!window) {
            return this.createTransparentTile(tileSize);
        }

        const [windowMinX, windowMinY, windowMaxX, windowMaxY] = window;
        const windowWidth = windowMaxX - windowMinX;
        const windowHeight = windowMaxY - windowMinY;

        const rasters = await image.readRasters({
            window: window,
            samples: [0, 1, 2],
            interleave: false,
        });
        
        const [r, g, b] = rasters as unknown as [Float32Array, Float32Array, Float32Array];

        if (!r || !g || !b) {
            return this.createTransparentTile(tileSize);
        }

        const variBuffer = this.calculateVariBuffer(r, g, b);

        return this.encodeImage(variBuffer, windowWidth, windowHeight, tileSize, options);
    }

    private calculateVariBuffer(
        r: Float32Array,
        g: Float32Array,
        b: Float32Array
    ): Buffer {
        const numPixels = r.length;
        const outputBuffer = Buffer.alloc(numPixels * 3);

        for (let i = 0; i < numPixels; i++) {
            const red = r[i];
            const green = g[i];
            const blue = b[i];

            const denominator = green + red - blue;
            let vari = 0;
            if (denominator !== 0) {
                vari = (green - red) / denominator;
            }

            const [colorR, colorG, colorB] = this.variToColor(vari);

            const outputIndex = i * 3;
            outputBuffer[outputIndex] = colorR;
            outputBuffer[outputIndex + 1] = colorG;
            outputBuffer[outputIndex + 2] = colorB;
        }

        return outputBuffer;
    }

    private variToColor(variValue: number): [number, number, number] {
        const minVari = 0.0;
        const maxVari = 0.3;

        let normalized = Math.min(1, Math.max(0, (variValue - minVari) / (maxVari - minVari)));

        let r: number, g: number, b: number;

        if (normalized > 0.6) {
            r = Math.round(255 * (1 - normalized));
            g = 255;
            b = 0;
        } else if (normalized > 0.3) {
            r = 255;
            g = Math.round(255 * (normalized / 0.6));
            b = 0;
        } else {
            r = Math.round(255 * normalized * 2);
            g = 0;
            b = 0;
        }

        return [r, g, b];
    }

    public async generateSpectralIndexTile(
        tiffId: string,
        params: TileParams,
        options: SpectralIndexOptions
    ): Promise<Buffer> {
        let { z, x, y } = params;
        const tileSize = options?.size || TileService.DEFAULT_TILE_SIZE;

        const entry = await geoTiffManager.loadGeoTiff(tiffId);
        const { image } = entry;

        const bandMetadata = await extractBandMetadata(image);
        console.log(`[TileService] Detected bands for ${tiffId}:`, bandMetadata.bandNames);

        let equation = options.equation;
        let colormap = options.colormap;

        if (!equation && options.indexName) {
            const indexDef = getIndexDefinition(options.indexName);
            if (!indexDef) {
                throw new Error(`Unknown spectral index: ${options.indexName}`);
            }
            equation = indexDef.equation;
            
            if (!colormap) {
                colormap = getRecommendedColorMap(options.indexName);
            }
            
            console.log(`[TileService] Using predefined index ${options.indexName}: ${equation}`);
        }

        if (!equation) {
            throw new Error('Either equation or indexName must be provided');
        }

        const geotiffBBoxWGS84 = this.getGeoTiffBBoxWGS84(image);
        const { zoom: correctedZoom, corrected } = autoCorrectZoom(x, y, z, geotiffBBoxWGS84);
        if (corrected) {
            z = correctedZoom;
            console.log(`[TileService] Using corrected zoom ${z} for index tile (original: ${params.z})`);
        }

        const bboxWGS84 = getTileBBoxWGS84(z, x, y);
        const bbox = this.reprojectBBox(bboxWGS84, image);
        const window = this.bboxToWindow(bbox, image);
        
        if (!window) {
            return this.createTransparentTile(tileSize);
        }

        const [windowMinX, windowMinY, windowMaxX, windowMaxY] = window;
        const windowWidth = windowMaxX - windowMinX;
        const windowHeight = windowMaxY - windowMinY;

        const bandCount = bandMetadata.bandCount;
        const samples = Array.from({ length: bandCount }, (_, i) => i);
        
        const rasters = await image.readRasters({
            window: window,
            samples: samples,
            interleave: false,
        });

        const bandData: Float32Array[] = [];
        for (let i = 0; i < bandCount; i++) {
            const raster = rasters[i] as Uint8Array | Uint16Array | Float32Array;
            if (raster instanceof Float32Array) {
                bandData.push(raster);
            } else {
                bandData.push(new Float32Array(raster));
            }
        }

        console.log(`[TileService] Calculating spectral index with equation: ${equation}`);
        const indexResult = calculateSpectralIndex(
            equation,
            bandData,
            bandMetadata,
            windowWidth,
            windowHeight
        );

        console.log(`[TileService] Index result - min: ${indexResult.min.toFixed(3)}, max: ${indexResult.max.toFixed(3)}, mean: ${indexResult.mean.toFixed(3)}`);

        const colormapName = (colormap || 'viridis') as ColorMapName;
        let pixelBuffer: Buffer;

        if (options.percentiles) {
            const [minP, maxP] = options.percentiles;
            pixelBuffer = applyColorMapWithPercentiles(indexResult.data, colormapName, minP, maxP);
        } else if (options.rescale) {
            const [min, max] = options.rescale;
            pixelBuffer = applyColorMap(indexResult.data, min, max, colormapName);
        } else {
            pixelBuffer = applyColorMap(indexResult.data, indexResult.min, indexResult.max, colormapName);
        }

        return this.encodeImage(pixelBuffer, windowWidth, windowHeight, tileSize, options);
    }

    private async encodeImage(
        pixelBuffer: Buffer,
        width: number,
        height: number,
        targetSize: number,
        options?: TileOptions
    ): Promise<Buffer> {
        const format = options?.format || 'png';
        const quality = options?.quality || 90;

        let pipeline = sharp(pixelBuffer, {
            raw: { width, height, channels: 3 },
        });

        if (width !== targetSize || height !== targetSize) {
            pipeline = pipeline.resize(targetSize, targetSize, { fit: 'fill' });
        }

        switch (format) {
            case 'jpeg':
                pipeline = pipeline.jpeg({ quality });
                break;
            case 'webp':
                pipeline = pipeline.webp({ quality });
                break;
            default:
                pipeline = pipeline.png();
        }

        return pipeline.toBuffer();
    }

    private async createTransparentTile(tileSize: number = TileService.DEFAULT_TILE_SIZE): Promise<Buffer> {
        const transparentBuffer = Buffer.alloc(tileSize * tileSize * 4, 0);
        return sharp(transparentBuffer, {
            raw: { width: tileSize, height: tileSize, channels: 4 },
        })
            .png()
            .toBuffer();
    }
}

export default new TileService();