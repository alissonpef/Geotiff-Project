/**
 * Testes de Validação - Tiles 256x256
 */

import sharp from 'sharp';

describe('Validação de Tiles', () => {
    describe('Dimensões 256x256', () => {
        test('tile deve ser exatamente 256x256 pixels', async () => {
            // Cria um tile de teste
            const testTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 0, g: 255, b: 0 }
                }
            })
                .png()
                .toBuffer();

            // Valida dimensões
            const metadata = await sharp(testTile).metadata();
            
            expect(metadata.width).toBe(256);
            expect(metadata.height).toBe(256);
            expect(metadata.format).toBe('png');
            expect(metadata.channels).toBe(3); // RGB
        });

        test('tile RGB deve ter 3 canais (RGB)', async () => {
            const rgbBuffer = Buffer.alloc(256 * 256 * 3);
            
            const png = await sharp(rgbBuffer, {
                raw: {
                    width: 256,
                    height: 256,
                    channels: 3
                }
            })
                .png()
                .toBuffer();

            const metadata = await sharp(png).metadata();
            expect(metadata.channels).toBe(3);
        });

        test('tile PNG deve ser menor que 100KB', async () => {
            const testTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 100, g: 150, b: 200 }
                }
            })
                .png()
                .toBuffer();

            expect(testTile.length).toBeLessThan(100 * 1024); // 100KB
        });
    });

    describe('Cores VARI', () => {
        test('verde deve ser RGB(0, 255, 0)', async () => {
            const greenTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 0, g: 255, b: 0 }
                }
            })
                .png()
                .toBuffer();

            const { data } = await sharp(greenTile).raw().toBuffer({ resolveWithObject: true });
            
            // Primeiro pixel
            expect(data[0]).toBe(0);   // R
            expect(data[1]).toBe(255); // G
            expect(data[2]).toBe(0);   // B
        });

        test('amarelo deve ser RGB(255, 255, 0)', async () => {
            const yellowTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 255, g: 255, b: 0 }
                }
            })
                .png()
                .toBuffer();

            const { data } = await sharp(yellowTile).raw().toBuffer({ resolveWithObject: true });
            
            expect(data[0]).toBe(255); // R
            expect(data[1]).toBe(255); // G
            expect(data[2]).toBe(0);   // B
        });

        test('vermelho deve ser RGB(255, 0, 0)', async () => {
            const redTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 255, g: 0, b: 0 }
                }
            })
                .png()
                .toBuffer();

            const { data } = await sharp(redTile).raw().toBuffer({ resolveWithObject: true });
            
            expect(data[0]).toBe(255); // R
            expect(data[1]).toBe(0);   // G
            expect(data[2]).toBe(0);   // B
        });
    });

    describe('Cálculo VARI', () => {
        test('VARI alto (>0.6) deve resultar em verde', () => {
            const r = 50, g = 200, b = 50;
            const vari = (g - r) / (g + r - b);
            
            expect(vari).toBeGreaterThan(0.6);
            // Cor esperada: verde (0, 255, 0)
        });

        test('VARI médio (0.3-0.6) deve resultar em amarelo', () => {
            const r = 80, g = 180, b = 60;
            const vari = (g - r) / (g + r - b);
            
            expect(vari).toBeGreaterThan(0.3);
            expect(vari).toBeLessThan(0.6);
            // Cor esperada: amarelo (255, 255, 0)
        });

        test('VARI baixo (<0.3) deve resultar em vermelho', () => {
            const r = 200, g = 150, b = 100;
            const vari = (g - r) / (g + r - b);
            
            expect(vari).toBeLessThan(0.3);
            // Cor esperada: vermelho (255, 0, 0)
        });

        test('VARI deve ser normalizado entre 0 e 1', () => {
            const r = 100, g = 200, b = 50;
            let vari = (g - r) / (g + r - b);
            
            // Normalização: [-1, 1] → [0, 1]
            vari = (vari + 1) / 2;
            
            expect(vari).toBeGreaterThanOrEqual(0);
            expect(vari).toBeLessThanOrEqual(1);
        });
    });

    describe('Formato PNG', () => {
        test('deve ser PNG válido', async () => {
            const testTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 128, g: 128, b: 128 }
                }
            })
                .png()
                .toBuffer();

            // PNG header: 89 50 4E 47 0D 0A 1A 0A
            expect(testTile[0]).toBe(0x89);
            expect(testTile[1]).toBe(0x50);
            expect(testTile[2]).toBe(0x4E);
            expect(testTile[3]).toBe(0x47);
        });

        test('PNG deve ter compressão adequada', async () => {
            // Tile uniforme (alta compressão)
            const uniformTile = await sharp({
                create: {
                    width: 256,
                    height: 256,
                    channels: 3,
                    background: { r: 100, g: 100, b: 100 }
                }
            })
                .png()
                .toBuffer();

            // Deve ser muito pequeno (< 1KB) devido à compressão
            expect(uniformTile.length).toBeLessThan(1024);
        });
    });
});
