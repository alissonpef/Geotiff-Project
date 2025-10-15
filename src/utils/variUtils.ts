const CHANNELS = 3;

function variToColor(variValue: number): [number, number, number] {
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

export function processRgbToVariBuffer(r: Float32Array, g: Float32Array, b: Float32Array): Buffer {
    const numPixels = r.length;
    const outputBuffer = Buffer.alloc(numPixels * CHANNELS); 

    for (let i = 0; i < numPixels; i++) {
        const red = r[i];
        const green = g[i];
        const blue = b[i];

        const denominator = green + red - blue;
        let vari = 0;
        if (denominator !== 0) {
            vari = (green - red) / denominator;
        }

        const [colorR, colorG, colorB] = variToColor(vari);

        const outputIndex = i * CHANNELS;
        outputBuffer[outputIndex] = colorR;
        outputBuffer[outputIndex + 1] = colorG;
        outputBuffer[outputIndex + 2] = colorB;
    }

    return outputBuffer;
}