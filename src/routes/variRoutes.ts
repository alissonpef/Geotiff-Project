import { Router } from 'express';
import tileController from '../controllers/TileController.js';

const router = Router();

router.get('/:tiffId/:z/:x/:y', (req, res) => tileController.getVariTile(req, res));

export default router;
