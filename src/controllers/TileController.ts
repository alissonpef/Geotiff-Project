/**
 * TileController - Controller simplificado para rotas de tiles
 */

import type { Request, Response } from 'express';
import tileService from '../services/TileService.js';
import type { TileParams } from '../types/index.js';

class TileController {
    /**
     * GET /tile/:tiffId/:z/:x/:y - Tile RGB
     */
    public async getTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            const pngBuffer = await tileService.generateRgbTile(tiffId, params);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            res.status(500).send(`Erro: ${(error as Error).message}`);
        }
    }

    /**
     * GET /vari/:tiffId/:z/:x/:y - Tile VARI
     */
    public async getVariTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            const pngBuffer = await tileService.generateVariTile(tiffId, params);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            res.status(500).send(`Erro: ${(error as Error).message}`);
        }
    }
}

export default new TileController();
