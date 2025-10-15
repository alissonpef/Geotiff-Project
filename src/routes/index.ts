import type { Express } from 'express';
import tileRoutes from './tileRoutes.js';
import variRoutes from './variRoutes.js';
import geotiffRoutes from './geotiffRoutes.js';

export function registerRoutes(app: Express): void {
    app.use('/tile', tileRoutes);
    app.use('/vari', variRoutes);
    app.use('/geotiffs', geotiffRoutes);

    app.get('/health', (req, res) => {
        res.json({
            success: true,
            status: 'OK',
            timestamp: new Date().toISOString(),
        });
    });
}
