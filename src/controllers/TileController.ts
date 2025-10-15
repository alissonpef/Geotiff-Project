import type { Request, Response } from 'express';
import tileService from '../services/TileService.js';
import type { TileParams } from '../types/index.js';
import { validateTileParams } from '../utils/tileUtils.js';

class TileController {
    public async getTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            if (!validateTileParams(params.z, params.x, params.y)) {
                res.status(400).json({ success: false, error: { error: 'InvalidParams', message: 'Invalid tile coordinates', statusCode: 400 } });
                return;
            }

            const pngBuffer = await tileService.generateRgbTile(tiffId, params);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            res.status(500).send(`Error: ${(error as Error).message}`);
        }
    }

    public async getVariTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            if (!validateTileParams(params.z, params.x, params.y)) {
                res.status(400).json({ success: false, error: { error: 'InvalidParams', message: 'Invalid tile coordinates', statusCode: 400 } });
                return;
            }

            const pngBuffer = await tileService.generateVariTile(tiffId, params);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            res.status(500).send(`Error: ${(error as Error).message}`);
        }
    }
}

export default new TileController();
