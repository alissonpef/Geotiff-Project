const TILE_SIZE = 256;
const CHANNELS = 3; // Saída RGB (para o Sharp)

/**
 * Mapeia um valor VARI (float de -1 a 1, teoricamente) para um valor de cor RGB (0-255).
 * Este é um colormap simples e customizável para visualização de vegetação.
 * Mapeamento: Valores baixos (solo/água) -> Cinza/Preto. Valores altos (vegetação saudável) -> Verde.
 * @param variValue O valor VARI calculado para o pixel.
 * @returns Um array [R, G, B] de 8 bits (0-255).
 */
function variToColor(variValue: number): [number, number, number] {
    // Definimos uma faixa de interesse para VARI (normalmente entre -0.2 e 0.5)
    const minVari = 0.0;
    const maxVari = 0.3; 
    
    // Normaliza o valor VARI para uma escala de 0 a 1 dentro da faixa definida
    let normalized = Math.min(1, Math.max(0, (variValue - minVari) / (maxVari - minVari)));

    let r: number, g: number, b: number;
    
    // Colormap Simples: Verde (saudável) -> Amarelo (moderado) -> Vermelho (estresse/solo)

    if (normalized > 0.6) {
        // Forte vegetação (Verde)
        r = Math.round(255 * (1 - normalized));
        g = 255;
        b = 0;
    } else if (normalized > 0.3) {
        // Vegetação moderada (Amarelo/Laranja)
        r = 255;
        g = Math.round(255 * (normalized / 0.6));
        b = 0;
    } else {
        // Pouca vegetação ou solo/água (Vermelho/Cinza Escuro)
        r = Math.round(255 * normalized * 2); 
        g = 0;
        b = 0;
    }

    // Retorna a cor interpolada (8-bit)
    return [r, g, b];
}


/**
 * Recebe arrays de pixels R, G, B, calcula o VARI e retorna um Buffer RGB para o Sharp.
 * @param r Array de pixels da banda Vermelha.
 * @param g Array de pixels da banda Verde.
 * @param b Array de pixels da banda Azul.
 * @returns Buffer de pixels interleaved (R G B R G B...) pronto para o Sharp.
 */
export function processRgbToVariBuffer(r: Float32Array, g: Float32Array, b: Float32Array): Buffer {
    const numPixels = r.length;
    // O novo buffer será 3 canais (R, G, B) de 8 bits por pixel
    const outputBuffer = Buffer.alloc(numPixels * CHANNELS); 

    for (let i = 0; i < numPixels; i++) {
        const red = r[i];
        const green = g[i];
        const blue = b[i];

        // 1. Cálculo do VARI
        const denominator = green + red - blue;
        let vari = 0;
        if (denominator !== 0) {
            vari = (green - red) / denominator;
        }

        // 2. Mapeamento para Cor RGB 8-bit
        const [colorR, colorG, colorB] = variToColor(vari);

        // 3. Preenchimento do Buffer de Saída (interleaved)
        const outputIndex = i * CHANNELS;
        outputBuffer[outputIndex] = colorR;
        outputBuffer[outputIndex + 1] = colorG;
        outputBuffer[outputIndex + 2] = colorB;
    }

    return outputBuffer;
}