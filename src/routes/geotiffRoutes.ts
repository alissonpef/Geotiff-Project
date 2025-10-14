/**
 * Rotas para gerenciamento de GeoTIFFs
 */

import { Router } from 'express';
import geotiffController from '../controllers/GeoTiffController.js';

const router = Router();

/**
 * GET /geotiffs - Lista GeoTIFFs disponíveis
 */
router.get('/', (req, res) => geotiffController.listAvailable(req, res));

/**
 * GET /geotiffs/loaded - Lista GeoTIFFs carregados em cache
 */
router.get('/loaded', (req, res) => geotiffController.listLoaded(req, res));

/**
 * POST /geotiffs/load - Carrega GeoTIFF no cache
 * Body: { idOrPath: string }
 */
router.post('/load', (req, res) => geotiffController.loadGeoTiff(req, res));

/**
 * DELETE /geotiffs/:id - Remove GeoTIFF do cache
 */
router.delete('/:id', (req, res) => geotiffController.unloadGeoTiff(req, res));

export default router;
