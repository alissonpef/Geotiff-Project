import type { Request, Response } from 'express';
import tileService from '../services/TileService.js';
import type { TileParams } from '../types/index.js';
import { validateTileParams } from '../utils/tileUtils.js';

// Função helper para resolver tiffId
function resolveTiffId(tiffId?: string): string {
    if (!tiffId || tiffId === 'default' || tiffId === '_default') {
        return process.env.DEFAULT_GEOTIFF || 'odm_orthophoto.tif';
    }
    return tiffId;
}

class TileController {
    public async getTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const { size } = req.query;
            
            const resolvedTiffId = resolveTiffId(tiffId);
            
            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            if (!validateTileParams(params.z, params.x, params.y)) {
                res.status(400).json({ success: false, error: { error: 'InvalidParams', message: 'Invalid tile coordinates', statusCode: 400 } });
                return;
            }

            const options = size ? { size: parseInt(size as string, 10) } : undefined;
            const pngBuffer = await tileService.generateRgbTile(resolvedTiffId, params, options);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            res.status(500).send(`Error: ${(error as Error).message}`);
        }
    }

    public async getVariTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const { size } = req.query;
            
            const resolvedTiffId = resolveTiffId(tiffId);
            
            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            if (!validateTileParams(params.z, params.x, params.y)) {
                res.status(400).json({ success: false, error: { error: 'InvalidParams', message: 'Invalid tile coordinates', statusCode: 400 } });
                return;
            }

            const options = size ? { size: parseInt(size as string, 10) } : undefined;
            const pngBuffer = await tileService.generateVariTile(resolvedTiffId, params, options);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            res.status(500).send(`Error: ${(error as Error).message}`);
        }
    }
}

export default new TileController();
