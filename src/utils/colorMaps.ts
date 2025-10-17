import chroma from 'chroma-js';

export type ColorMapName = 'viridis' | 'RdYlGn' | 'RdYlBu' | 'Spectral' | 'Greys';

const COLORMAP_CACHE = new Map<string, Uint8Array>();

const COLORMAP_DEFS: Record<ColorMapName, string[]> = {
    RdYlGn: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
    RdYlBu: ['#d73027', '#fc8d59', '#fee090', '#e0f3f8', '#91bfdb', '#4575b4'],
    Spectral: ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
    Greys: ['#000000', '#525252', '#969696', '#d9d9d9', '#ffffff'],
    viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
};

function getColormapLUT(name: ColorMapName, nshades: number = 256): Uint8Array {
    const cacheKey = `${name}_${nshades}`;
    if (COLORMAP_CACHE.has(cacheKey)) return COLORMAP_CACHE.get(cacheKey)!;

    const scale = chroma.scale(COLORMAP_DEFS[name]).mode('lab').colors(nshades);
    const lut = new Uint8Array(nshades * 3);
    
    for (let i = 0; i < nshades; i++) {
        const rgb = chroma(scale[i]).rgb();
        lut[i * 3] = Math.round(rgb[0]);
        lut[i * 3 + 1] = Math.round(rgb[1]);
        lut[i * 3 + 2] = Math.round(rgb[2]);
    }

    COLORMAP_CACHE.set(cacheKey, lut);
    return lut;
}

export function applyColorMapWithRange(
    data: Float32Array,
    colormapName: ColorMapName,
    minVal: number,
    maxVal: number
): Uint8Array {
    const lut = getColormapLUT(colormapName);
    const range = maxVal - minVal;
    const scale = range > 0 ? 255 / range : 0;
    const output = new Uint8Array(data.length * 3);
    
    for (let i = 0; i < data.length; i++) {
        let val = data[i];
        if (!isFinite(val)) continue;
        
        val = Math.max(0, Math.min(255, (val - minVal) * scale));
        const lutIdx = Math.floor(val) * 3;
        
        output[i * 3] = lut[lutIdx];
        output[i * 3 + 1] = lut[lutIdx + 1];
        output[i * 3 + 2] = lut[lutIdx + 2];
    }
    
    return output;
}

export function getRecommendedColorMap(indexName: string): ColorMapName {
    const map: Record<string, ColorMapName> = {
        NDVI: 'RdYlGn', GNDVI: 'RdYlGn', SAVI: 'RdYlGn', EVI: 'RdYlGn',
        NDRE: 'RdYlGn', MSAVI: 'RdYlGn', NDWI: 'RdYlBu', NDMI: 'RdYlBu',
        NBR: 'Spectral', VARI: 'viridis',
    };
    return map[indexName.toUpperCase()] || 'viridis';
}

export function listColorMaps(): ColorMapName[] {
    return Object.keys(COLORMAP_DEFS) as ColorMapName[];
}

export function clearColormapCache(): void {
    COLORMAP_CACHE.clear();
}
