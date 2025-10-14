/**
 * Rotas para tiles VARI
 */

import { Router } from 'express';
import tileController from '../controllers/TileController.js';

const router = Router();

/**
 * GET /vari/:tiffId/:z/:x/:y - Retorna tile VARI (mapa de calor) em PNG
 */
router.get('/:tiffId/:z/:x/:y', (req, res) => tileController.getVariTile(req, res));

export default router;
