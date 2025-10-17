import type * as GeoTIFF from 'geotiff';

export interface BandInfo {
    index: number;
    name: string;
    description?: string;
    wavelength?: number;
}

export interface ImageBandMetadata {
    bands: BandInfo[];
    bandCount: number;
    bandNames: string[];
    bandByName: Map<string, number>;
}

export async function extractBandMetadata(image: GeoTIFF.GeoTIFFImage): Promise<ImageBandMetadata> {
    const bandCount = image.getSamplesPerPixel();
    const bands: BandInfo[] = [];
    const bandNames: string[] = [];
    const bandByName = new Map<string, number>();

    const fileDirectory = image.getFileDirectory();
    let gdalMetadata: string | undefined;
    
    if (fileDirectory.GDAL_METADATA) {
        gdalMetadata = fileDirectory.GDAL_METADATA as string;
    }

    let bandDescriptions: string[] = [];
    if (gdalMetadata) {
        bandDescriptions = parseGDALMetadata(gdalMetadata, bandCount);
    }

    if (bandDescriptions.length === 0) {
        bandDescriptions = getDefaultBandNames(bandCount);
    }

    for (let i = 0; i < bandCount; i++) {
        const name = bandDescriptions[i] || `Band${i + 1}`;
        const bandInfo: BandInfo = {
            index: i,
            name: name,
            description: bandDescriptions[i],
        };

        bands.push(bandInfo);
        bandNames.push(name);
        bandByName.set(name.toLowerCase(), i);
        
        const aliases = getBandAliases(name, i, bandCount);
        aliases.forEach(alias => {
            bandByName.set(alias.toLowerCase(), i);
        });
    }


    return {
        bands,
        bandCount,
        bandNames,
        bandByName,
    };
}

function parseGDALMetadata(metadata: string, bandCount: number): string[] {
    const bandNames: string[] = [];
    
    try {
        const descRegex = /<Item name="DESCRIPTION" sample="(\d+)"[^>]*>([^<]+)<\/Item>/gi;
        let match;
        
        while ((match = descRegex.exec(metadata)) !== null) {
            const bandNum = parseInt(match[1], 10);
            const bandName = match[2].trim();
            if (bandNum < bandCount) {
                bandNames[bandNum] = bandName;
            }
        }
        
        if (bandNames.length === 0 || bandNames.filter(Boolean).length === 0) {
            const bandRegex = /<Item name="Band_(\d+)"[^>]*>([^<]+)<\/Item>/gi;
            
            while ((match = bandRegex.exec(metadata)) !== null) {
                const bandNum = parseInt(match[1], 10) - 1;
                const bandName = match[2].trim();
                if (bandNum < bandCount) {
                    bandNames[bandNum] = bandName;
                }
            }
        }

        if (bandNames.length === 0 || bandNames.filter(Boolean).length === 0) {
            const nameRegex = /<Item name="BAND_NAME">([^<]+)<\/Item>/gi;
            const names = [];
            while ((match = nameRegex.exec(metadata)) !== null) {
                names.push(match[1].trim());
            }
            
            if (names.length > 0) {
                return names.slice(0, bandCount);
            }
        }
    } catch (error) {
        console.warn('[BandMetadata] Error parsing GDAL metadata:', error);
    }

    return bandNames;
}

function getDefaultBandNames(bandCount: number): string[] {

    if (bandCount === 3) {
        return ['Red', 'Green', 'Blue'];
    } else if (bandCount === 4) {
        return ['Red', 'Green', 'Blue', 'NIR'];
    } else if (bandCount === 5) {
        return ['Blue', 'Green', 'Red', 'NIR', 'SWIR1'];
    } else if (bandCount === 6) {
        return ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'];
    } else if (bandCount === 8) {
        return ['Coastal', 'Blue', 'Green', 'Red', 'RedEdge', 'NIR', 'SWIR1', 'SWIR2'];
    }

    return Array.from({ length: bandCount }, (_, i) => `Band${i + 1}`);
}

function getBandAliases(name: string, index: number, totalBands: number): string[] {
    const aliases: string[] = [];
    const lowerName = name.toLowerCase();

    aliases.push(`b${index + 1}`);
    aliases.push(`band${index + 1}`);

    if (lowerName.includes('red') && !lowerName.includes('edge')) {
        aliases.push('r', 'red');
    } else if (lowerName.includes('green')) {
        aliases.push('g', 'green');
    } else if (lowerName.includes('blue')) {
        aliases.push('b', 'blue');
    } else if (lowerName.includes('nir') || lowerName.includes('infrared')) {
        aliases.push('nir', 'near_infrared');
    } else if (lowerName.includes('swir')) {
        aliases.push('swir');
        if (lowerName.includes('1')) aliases.push('swir1');
        if (lowerName.includes('2')) aliases.push('swir2');
    } else if (lowerName.includes('rededge')) {
        aliases.push('rededge', 're');
    }

    return aliases;
}

export function inferBandFromCommonName(
    commonName: string,
    metadata: ImageBandMetadata
): number | null {
    const normalized = commonName.toLowerCase().trim();
    
    if (metadata.bandByName.has(normalized)) {
        return metadata.bandByName.get(normalized)!;
    }

    for (const [name, index] of metadata.bandByName.entries()) {
        if (name.includes(normalized) || normalized.includes(name)) {
            return index;
        }
    }

    return null;
}
