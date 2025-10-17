export type ColorMapName = 
    | 'viridis'
    | 'plasma'
    | 'inferno'
    | 'magma'
    | 'cividis'
    | 'RdYlGn'    
    | 'RdYlBu'    
    | 'Spectral'
    | 'Greys'
    | 'terrain'
    | 'ndvi'        
    | 'custom';

export interface ColorMap {
    name: ColorMapName;
    colors: [number, number, number][]; 
}

const COLORMAPS: Record<ColorMapName, [number, number, number][]> = {
    viridis: [
        [68, 1, 84],
        [59, 82, 139],
        [33, 145, 140],
        [94, 201, 98],
        [253, 231, 37],
    ],
    plasma: [
        [13, 8, 135],
        [126, 3, 168],
        [204, 71, 120],
        [248, 149, 64],
        [240, 249, 33],
    ],
    inferno: [
        [0, 0, 4],
        [87, 16, 110],
        [188, 55, 84],
        [249, 142, 9],
        [252, 255, 164],
    ],
    magma: [
        [0, 0, 4],
        [81, 18, 124],
        [183, 55, 121],
        [251, 136, 97],
        [252, 253, 191],
    ],
    cividis: [
        [0, 32, 76],
        [0, 90, 124],
        [122, 135, 124],
        [213, 181, 118],
        [255, 233, 69],
    ],
    RdYlGn: [
        [165, 0, 38],  
        [215, 48, 39],    
        [252, 141, 89], 
        [254, 224, 139],
        [217, 239, 139],  
        [166, 217, 106],  
        [26, 152, 80], 
        [0, 104, 55],     
    ],
    RdYlBu: [
        [165, 0, 38],
        [215, 48, 39],
        [244, 109, 67],
        [253, 174, 97],
        [254, 224, 144],
        [224, 243, 248],
        [171, 217, 233],
        [116, 173, 209],
        [69, 117, 180],
        [49, 54, 149],
    ],
    Spectral: [
        [158, 1, 66],
        [213, 62, 79],
        [244, 109, 67],
        [253, 174, 97],
        [254, 224, 139],
        [230, 245, 152],
        [171, 221, 164],
        [102, 194, 165],
        [50, 136, 189],
        [94, 79, 162],
    ],
    Greys: [
        [0, 0, 0],
        [64, 64, 64],
        [128, 128, 128],
        [192, 192, 192],
        [255, 255, 255],
    ],
    terrain: [
        [51, 102, 153], 
        [102, 153, 102],   
        [153, 153, 102], 
        [204, 153, 102],   
        [255, 255, 255],  
    ],
    ndvi: [
        [165, 0, 38],  
        [215, 88, 39],   
        [244, 165, 89],
        [254, 224, 139],  
        [217, 239, 139],   
        [166, 217, 106], 
        [102, 194, 165], 
        [26, 152, 80], 
        [0, 104, 55],     
    ],
    custom: [],
};

function interpolateColor(
    color1: [number, number, number],
    color2: [number, number, number],
    factor: number
): [number, number, number] {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * factor);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * factor);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * factor);
    return [r, g, b];
}

export function getColorFromMap(
    normalizedValue: number,
    colorMapName: ColorMapName = 'viridis'
): [number, number, number] {
    const colors = COLORMAPS[colorMapName];
    
    if (colors.length === 0) {
        return [128, 128, 128]; 
    }

    const clamped = Math.max(0, Math.min(1, normalizedValue));

    const scaledValue = clamped * (colors.length - 1);
    const lowerIndex = Math.floor(scaledValue);
    const upperIndex = Math.ceil(scaledValue);

    if (lowerIndex === upperIndex) {
        return colors[lowerIndex];
    }

    const factor = scaledValue - lowerIndex;
    return interpolateColor(colors[lowerIndex], colors[upperIndex], factor);
}

export function applyColorMap(
    data: Float32Array,
    min: number,
    max: number,
    colorMapName: ColorMapName = 'viridis'
): Buffer {
    const numPixels = data.length;
    const outputBuffer = Buffer.alloc(numPixels * 3);

    const range = max - min;
    if (range === 0) {
        const midColor = getColorFromMap(0.5, colorMapName);
        for (let i = 0; i < numPixels; i++) {
            const outputIndex = i * 3;
            outputBuffer[outputIndex] = midColor[0];
            outputBuffer[outputIndex + 1] = midColor[1];
            outputBuffer[outputIndex + 2] = midColor[2];
        }
        return outputBuffer;
    }

    for (let i = 0; i < numPixels; i++) {
        const value = data[i];
        
        const normalized = (value - min) / range;
        
        const [r, g, b] = getColorFromMap(normalized, colorMapName);
        
        const outputIndex = i * 3;
        outputBuffer[outputIndex] = r;
        outputBuffer[outputIndex + 1] = g;
        outputBuffer[outputIndex + 2] = b;
    }

    return outputBuffer;
}

export function applyColorMapWithPercentiles(
    data: Float32Array,
    colorMapName: ColorMapName = 'viridis',
    minPercentile: number = 2,
    maxPercentile: number = 98
): Buffer {
    const sorted = Array.from(data).sort((a, b) => a - b);
    const minIndex = Math.floor((minPercentile / 100) * sorted.length);
    const maxIndex = Math.floor((maxPercentile / 100) * sorted.length);
    
    const min = sorted[minIndex];
    const max = sorted[maxIndex];

    return applyColorMap(data, min, max, colorMapName);
}

export function listColorMaps(): ColorMapName[] {
    return Object.keys(COLORMAPS) as ColorMapName[];
}

export function createCustomColorMap(colors: [number, number, number][]): ColorMapName {
    COLORMAPS.custom = colors;
    return 'custom';
}

export function getRecommendedColorMap(indexName: string): ColorMapName {
    const normalized = indexName.toUpperCase();
    
    const colorMapByIndex: Record<string, ColorMapName> = {
        'NDVI': 'RdYlGn',
        'GNDVI': 'RdYlGn',
        'SAVI': 'RdYlGn',
        'EVI': 'RdYlGn',
        'NDRE': 'RdYlGn',
        'MSAVI': 'RdYlGn',
        'NDWI': 'RdYlBu',
        'NDMI': 'RdYlBu',
        'NBR': 'Spectral',
        'VARI': 'viridis',
    };

    return colorMapByIndex[normalized] || 'viridis';
}
