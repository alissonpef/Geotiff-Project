/**
 * Registro central de rotas
 */

import type { Express } from 'express';
import tileRoutes from './tileRoutes.js';
import variRoutes from './variRoutes.js';
import geotiffRoutes from './geotiffRoutes.js';

export function registerRoutes(app: Express): void {
    // Rotas de tiles
    app.use('/tile', tileRoutes);
    app.use('/vari', variRoutes);
    app.use('/geotiffs', geotiffRoutes);

    // Rota de health check
    app.get('/health', (req, res) => {
        res.json({
            success: true,
            status: 'OK',
            timestamp: new Date().toISOString(),
        });
    });
}
