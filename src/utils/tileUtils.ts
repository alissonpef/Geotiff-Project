import mercator from 'global-mercator';

/**
 * Converte as coordenadas Z/X/Y (Web Mercator) para uma Bounding Box geográfica (WGS84).
 * @param z Nível de Zoom
 * @param x Coluna do Tile
 * @param y Linha do Tile
 * @returns [minLon, minLat, maxLon, maxLat] em graus WGS84.
 */
export function getTileBBoxWGS84(z: number, x: number, y: number): [number, number, number, number] {
    // A biblioteca 'global-mercator' converte tile [x, y, z] 
    // para bbox [west, south, east, north] em WGS84
    // Formato esperado pelo GeoTIFF.js: [minLon, minLat, maxLon, maxLat]
    const bbox = mercator.tileToBBox([x, y, z]);
    
    const [west, south, east, north] = bbox;
    
    // Formato GeoTIFF.js espera: [minLon, minLat, maxLon, maxLat]
    return [west, south, east, north]; 
}

/**
 * Funções auxiliares para validação de parâmetros.
 */
export function validateTileParams(z: number, x: number, y: number): boolean {
    if (isNaN(z) || isNaN(x) || isNaN(y)) return false;
    if (z < 0 || x < 0 || y < 0) return false;
    // Adicionar aqui lógica para limitar o zoom se necessário (e.g., z > 22)
    return true;
}