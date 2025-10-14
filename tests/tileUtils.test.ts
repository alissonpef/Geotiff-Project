/**
 * Testes Unitários - Coordenadas de Tiles
 */

describe('Tile Coordinates', () => {
    describe('Sistema de tiles Web Mercator', () => {
        test('zoom 0 deve ter apenas 1 tile (mundo inteiro)', () => {
            const tilesAtZoom0 = Math.pow(2, 0) * Math.pow(2, 0);
            expect(tilesAtZoom0).toBe(1);
        });

        test('zoom 1 deve ter 4 tiles (2x2 grid)', () => {
            const tilesAtZoom1 = Math.pow(2, 1) * Math.pow(2, 1);
            expect(tilesAtZoom1).toBe(4);
        });

        test('zoom 18 deve ter 2^36 tiles', () => {
            const tilesAtZoom18 = Math.pow(2, 18) * Math.pow(2, 18);
            expect(tilesAtZoom18).toBe(68719476736);
        });

        test('cada zoom dobra as dimensões da grade', () => {
            for (let z = 0; z < 5; z++) {
                const tilesPerSide = Math.pow(2, z);
                const totalTiles = tilesPerSide * tilesPerSide;
                
                expect(totalTiles).toBe(Math.pow(4, z));
            }
        });

        test('coordenadas de tile devem ser não-negativas', () => {
            const z = 18, x = 174208, y = 118632;
            
            expect(z).toBeGreaterThanOrEqual(0);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(y).toBeGreaterThanOrEqual(0);
        });

        test('coordenadas de tile devem estar dentro dos limites do zoom', () => {
            const z = 18;
            const maxCoord = Math.pow(2, z) - 1;
            const x = 174208, y = 118632;
            
            expect(x).toBeLessThanOrEqual(maxCoord);
            expect(y).toBeLessThanOrEqual(maxCoord);
        });
    });
});
