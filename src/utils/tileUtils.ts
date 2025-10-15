import mercator from 'global-mercator';

/**
 * @param z Nível de Zoom (inteiro >= 0)
 * @param x Coluna do Tile (inteiro, 0 <= x <= 2^z - 1)
 * @param y Linha do Tile (inteiro, 0 <= y <= 2^z - 1)
 * @returns [minLon, minLat, maxLon, maxLat] em graus WGS84.
 */
export function getTileBBoxWGS84(z: number, x: number, y: number): [number, number, number, number] {
  const bbox = mercator.tileToBBox([x, y, z]);
  const [west, south, east, north] = bbox;
  return [west, south, east, north];
}

export function tmsYToXyzY(z: number, yTms: number): number {
  return (2 ** z - 1) - yTms;
}

export function validateTileParams(z: number, x: number, y: number, maxZoom = 22): boolean {
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (z < 0 || z > maxZoom) return false;
  const maxIndex = 2 ** z - 1;
  if (x < 0 || x > maxIndex) return false;
  if (y < 0 || y > maxIndex) return false;
  return true;
}