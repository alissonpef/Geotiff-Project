import mercator from 'global-mercator';

export function getTileBBoxWGS84(z: number, x: number, y: number): [number, number, number, number] {
  const yTMS = tmsYToXyzY(z, y);
  const bbox = mercator.tileToBBox([x, yTMS, z]);
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

export function areTileCoordinatesInBBox(
  x: number, 
  y: number, 
  z: number, 
  geotiffBBox: [number, number, number, number]
): boolean {
  const [west, south, east, north] = geotiffBBox;
  
  const n = 2 ** z;
  
  const minTileX = Math.floor(((west + 180) / 360) * n);
  const maxTileX = Math.floor(((east + 180) / 360) * n);
  
  const minLatRad = (north * Math.PI) / 180;
  const maxLatRad = (south * Math.PI) / 180;
  
  const minTileY = Math.floor(((1 - Math.log(Math.tan(minLatRad) + 1 / Math.cos(minLatRad)) / Math.PI) / 2) * n);
  const maxTileY = Math.floor(((1 - Math.log(Math.tan(maxLatRad) + 1 / Math.cos(maxLatRad)) / Math.PI) / 2) * n);
  
  return x >= minTileX && x <= maxTileX && y >= minTileY && y <= maxTileY;
}

export function autoCorrectZoom(
  x: number,
  y: number,
  requestedZoom: number,
  geotiffBBox: [number, number, number, number]
): { zoom: number; corrected: boolean } {
  if (areTileCoordinatesInBBox(x, y, requestedZoom, geotiffBBox)) {
    return { zoom: requestedZoom, corrected: false };
  }
  
  if (requestedZoom > 0 && areTileCoordinatesInBBox(x, y, requestedZoom - 1, geotiffBBox)) {
    console.warn(
      `[TileUtils] Auto-correcting zoom from ${requestedZoom} to ${requestedZoom - 1} ` +
      `for coordinates x=${x}, y=${y}. ` +
      `This may indicate a mismatch between URL zoom and actual tile coordinates.`
    );
    return { zoom: requestedZoom - 1, corrected: true };
  }
  
  return { zoom: requestedZoom, corrected: false };
}