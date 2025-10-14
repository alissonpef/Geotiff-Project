/**
 * TileService - Serviço para processamento de tiles
 * Abstração para trabalhar com múltiplos GeoTIFFs
 */

import sharp from 'sharp';
import geoTiffManager from './GeoTiffManager.js';
import { getTileBBoxWGS84 } from '../utils/tileUtils.js';
import type { TileParams, TileOptions } from '../types/index.js';

class TileService {
    private static readonly TILE_SIZE = 256;

    /**
     * Gera tile RGB de um GeoTIFF específico
     */
    public async generateRgbTile(
        tiffId: string,
        params: TileParams,
        options?: TileOptions
    ): Promise<Buffer> {
        const { z, x, y } = params;

        // Carrega GeoTIFF
        const entry = await geoTiffManager.loadGeoTiff(tiffId);
        const { image } = entry;

        // Obtém bounding box do tile
        const bbox = getTileBBoxWGS84(z, x, y);

        // Lê rasters
        const rasters = await image.readRasters({
            bbox: bbox,
            width: TileService.TILE_SIZE,
            height: TileService.TILE_SIZE,
            samples: [0, 1, 2],
            interleave: true,
        });

        if (!rasters || rasters.length === 0) {
            // Retorna tile transparente
            return this.createTransparentTile();
        }

        // Converte para PNG
        const rasterData = rasters as unknown as Uint8Array | Uint16Array | Float32Array;
        const pixelBuffer = Buffer.from(
            rasterData.buffer,
            rasterData.byteOffset,
            rasterData.byteLength
        );

        return this.encodeImage(pixelBuffer, options);
    }

    /**
     * Gera tile VARI de um GeoTIFF específico
     */
    public async generateVariTile(
        tiffId: string,
        params: TileParams,
        options?: TileOptions
    ): Promise<Buffer> {
        const { z, x, y } = params;

        // Carrega GeoTIFF
        const entry = await geoTiffManager.loadGeoTiff(tiffId);
        const { image } = entry;

        // Obtém bounding box do tile
        const bbox = getTileBBoxWGS84(z, x, y);

        // Lê rasters (não interleaved para acessar bandas separadamente)
        const rasters = await image.readRasters({
            bbox: bbox,
            width: TileService.TILE_SIZE,
            height: TileService.TILE_SIZE,
            samples: [0, 1, 2],
            interleave: false,
        });
        
        const [r, g, b] = rasters as unknown as [Float32Array, Float32Array, Float32Array];

        if (!r || !g || !b) {
            return this.createTransparentTile();
        }

        // Calcula VARI e aplica colormap
        const variBuffer = this.calculateVariBuffer(r, g, b);

        return this.encodeImage(variBuffer, options);
    }

    /**
     * Calcula VARI e mapeia para cores
     */
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

            // Calcula VARI
            const denominator = green + red - blue;
            let vari = 0;
            if (denominator !== 0) {
                vari = (green - red) / denominator;
            }

            // Mapeia para cor RGB
            const [colorR, colorG, colorB] = this.variToColor(vari);

            const outputIndex = i * 3;
            outputBuffer[outputIndex] = colorR;
            outputBuffer[outputIndex + 1] = colorG;
            outputBuffer[outputIndex + 2] = colorB;
        }

        return outputBuffer;
    }

    /**
     * Mapeia valor VARI para cor RGB
     */
    private variToColor(variValue: number): [number, number, number] {
        const minVari = 0.0;
        const maxVari = 0.3;

        let normalized = Math.min(1, Math.max(0, (variValue - minVari) / (maxVari - minVari)));

        let r: number, g: number, b: number;

        if (normalized > 0.6) {
            // Verde (vegetação saudável)
            r = Math.round(255 * (1 - normalized));
            g = 255;
            b = 0;
        } else if (normalized > 0.3) {
            // Amarelo/Laranja (vegetação moderada)
            r = 255;
            g = Math.round(255 * (normalized / 0.6));
            b = 0;
        } else {
            // Vermelho (solo/estresse)
            r = Math.round(255 * normalized * 2);
            g = 0;
            b = 0;
        }

        return [r, g, b];
    }

    /**
     * Codifica buffer de pixels para formato de imagem
     */
    private async encodeImage(
        pixelBuffer: Buffer,
        options?: TileOptions
    ): Promise<Buffer> {
        const format = options?.format || 'png';
        const quality = options?.quality || 90;

        let pipeline = sharp(pixelBuffer, {
            raw: { width: TileService.TILE_SIZE, height: TileService.TILE_SIZE, channels: 3 },
        });

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

    /**
     * Cria tile transparente
     */
    private async createTransparentTile(): Promise<Buffer> {
        const transparentBuffer = Buffer.alloc(TileService.TILE_SIZE * TileService.TILE_SIZE * 4, 0);
        return sharp(transparentBuffer, {
            raw: { width: TileService.TILE_SIZE, height: TileService.TILE_SIZE, channels: 4 },
        })
            .png()
            .toBuffer();
    }
}

export default new TileService();
