import type { ImageBandMetadata } from './bandMetadata.js';
import { tokenize, extractVariables, evaluateExpression } from './expressionParser.js';

export interface SpectralIndexResult {
    data: Float32Array;
    width: number;
    height: number;
    min: number;
    max: number;
    mean: number;
}

export function calculateSpectralIndex(
    equation: string,
    bandData: Float32Array[],
    metadata: ImageBandMetadata,
    width: number,
    height: number
): SpectralIndexResult {
    const tokens = tokenize(equation);
    const variables = extractVariables(tokens);

    const variableToBandIndex = new Map<string, number>();
    for (const varName of variables) {
        const bandIndex = metadata.bandByName.get(varName);
        if (bandIndex === undefined) {
            throw new Error(
                `Variable '${varName}' not found in available bands: ${metadata.bandNames.join(', ')}`
            );
        }
        variableToBandIndex.set(varName, bandIndex);
    }

    for (const [varName, bandIndex] of variableToBandIndex.entries()) {
        if (bandIndex >= bandData.length) {
            throw new Error(
                `Band index ${bandIndex} for variable '${varName}' is out of range. ` +
                `Available bands: 0-${bandData.length - 1}`
            );
        }
    }

    const numPixels = width * height;
    const resultData = new Float32Array(numPixels);
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let i = 0; i < numPixels; i++) {
        const pixelVars: Record<string, number> = {};
        for (const [varName, bandIndex] of variableToBandIndex.entries()) {
            pixelVars[varName] = bandData[bandIndex][i];
        }

        try {
            const value = evaluateExpression(equation, pixelVars);
            
            if (!isFinite(value)) {
                resultData[i] = 0;
            } else {
                resultData[i] = value;
                min = Math.min(min, value);
                max = Math.max(max, value);
                sum += value;
            }
        } catch (error) {
            resultData[i] = 0;
        }
    }

    const mean = sum / numPixels;

    return {
        data: resultData,
        width,
        height,
        min: isFinite(min) ? min : 0,
        max: isFinite(max) ? max : 1,
        mean: isFinite(mean) ? mean : 0,
    };
}

export interface SpectralIndexDefinition {
    name: string;
    equation: string;
    description: string;
    range: [number, number];
    visualRange?: [number, number]; // Range otimizado para visualização (P2-P98)
    requiredBands: string[];
    reference?: string;
}

export const SPECTRAL_INDICES: Record<string, SpectralIndexDefinition> = {
    NDVI: {
        name: 'Normalized Difference Vegetation Index',
        equation: '(nir - red) / (nir + red)',
        description: 'Índice de vegetação mais comum, varia de -1 a 1',
        range: [-1, 1],
        visualRange: [0.2, 0.9], // Range típico para áreas vegetadas (melhor contraste)
        requiredBands: ['nir', 'red'],
        reference: 'Tucker (1979)',
    },
    NDWI: {
        name: 'Normalized Difference Water Index',
        equation: '(green - nir) / (green + nir)',
        description: 'Índice de água, útil para detectar corpos d\'água',
        range: [-1, 1],
        requiredBands: ['green', 'nir'],
        reference: 'McFeeters (1996)',
    },
    EVI: {
        name: 'Enhanced Vegetation Index',
        equation: '2.5 * ((nir - red) / (nir + 6 * red - 7.5 * blue + 1))',
        description: 'Versão melhorada do NDVI, reduz influência atmosférica',
        range: [-1, 1],
        requiredBands: ['nir', 'red', 'blue'],
        reference: 'Huete et al. (2002)',
    },
    SAVI: {
        name: 'Soil Adjusted Vegetation Index',
        equation: '((nir - red) / (nir + red + 0.5)) * 1.5',
        description: 'Minimiza influência do solo em áreas de baixa cobertura vegetal',
        range: [-1, 1],
        requiredBands: ['nir', 'red'],
        reference: 'Huete (1988)',
    },
    VARI: {
        name: 'Visible Atmospherically Resistant Index',
        equation: '(green - red) / (green + red - blue)',
        description: 'Índice de vegetação baseado apenas em bandas visíveis',
        range: [-1, 1],
        requiredBands: ['green', 'red', 'blue'],
    },
    NDMI: {
        name: 'Normalized Difference Moisture Index',
        equation: '(nir - swir1) / (nir + swir1)',
        description: 'Sensível ao conteúdo de água na vegetação',
        range: [-1, 1],
        requiredBands: ['nir', 'swir1'],
        reference: 'Gao (1996)',
    },
    NBR: {
        name: 'Normalized Burn Ratio',
        equation: '(nir - swir2) / (nir + swir2)',
        description: 'Útil para mapear áreas queimadas',
        range: [-1, 1],
        requiredBands: ['nir', 'swir2'],
        reference: 'Key & Benson (2006)',
    },
    GNDVI: {
        name: 'Green Normalized Difference Vegetation Index',
        equation: '(nir - green) / (nir + green)',
        description: 'Similar ao NDVI mas usa banda verde, sensível a clorofila',
        range: [-1, 1],
        requiredBands: ['nir', 'green'],
    },
    NDRE: {
        name: 'Normalized Difference Red Edge',
        equation: '(nir - rededge) / (nir + rededge)',
        description: 'Útil para monitoramento de saúde vegetal',
        range: [-1, 1],
        requiredBands: ['nir', 'rededge'],
    },
    MSAVI: {
        name: 'Modified Soil Adjusted Vegetation Index',
        equation: '(2 * nir + 1 - sqrt((2 * nir + 1)^2 - 8 * (nir - red))) / 2',
        description: 'Versão melhorada do SAVI sem parâmetro L fixo',
        range: [-1, 1],
        requiredBands: ['nir', 'red'],
        reference: 'Qi et al. (1994)',
    },
};

export function getIndexDefinition(indexName: string): SpectralIndexDefinition | null {
    const normalized = indexName.toUpperCase();
    return SPECTRAL_INDICES[normalized] || null;
}

export function listAvailableIndices(): SpectralIndexDefinition[] {
    return Object.values(SPECTRAL_INDICES);
}

export function canCalculateIndex(
    indexName: string,
    metadata: ImageBandMetadata
): { canCalculate: boolean; missingBands?: string[] } {
    const indexDef = getIndexDefinition(indexName);
    if (!indexDef) {
        return { canCalculate: false };
    }

    const missingBands: string[] = [];
    for (const requiredBand of indexDef.requiredBands) {
        if (!metadata.bandByName.has(requiredBand)) {
            missingBands.push(requiredBand);
        }
    }

    if (missingBands.length > 0) {
        return { canCalculate: false, missingBands };
    }

    return { canCalculate: true };
}
