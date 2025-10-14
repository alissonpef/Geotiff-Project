/**
 * Rotas para tiles RGB
 */

import { Router } from 'express';
import tileController from '../controllers/TileController.js';

const router = Router();

/**
 * GET /tile/:tiffId/:z/:x/:y - Retorna tile RGB em PNG
 */
router.get('/:tiffId/:z/:x/:y', (req, res) => tileController.getTile(req, res));

export default router;
