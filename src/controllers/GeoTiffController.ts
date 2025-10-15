import type { Request, Response } from 'express';
import geotiffManager from '../services/GeoTiffManager.js';

class GeoTiffController {
    public async listAvailable(req: Request, res: Response): Promise<void> {
        try {
            const available = await geotiffManager.listAvailable();
            res.json({ success: true, data: available });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    }

    public async listLoaded(req: Request, res: Response): Promise<void> {
        try {
            const loaded = geotiffManager.listLoaded();
            res.json({ success: true, data: loaded });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    }

    public async loadGeoTiff(req: Request, res: Response): Promise<void> {
        try {
            const { idOrPath } = req.body;
            const info = await geotiffManager.loadGeoTiff(idOrPath);
            res.json({ success: true, data: info });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    }

    public async unloadGeoTiff(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = geotiffManager.unload(id);
            if (success) {
                res.json({ success: true, message: `GeoTIFF "${id}" removed` });
            } else {
                res.status(404).json({ success: false, error: 'Not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    }
}

export default new GeoTiffController();
