import { Router } from 'express';
import tileController from '../controllers/TileController.js';

const router = Router();

router.get('/:z/:x/:y', (req, res) => {
    (req.params as any).tiffId = 'default';
    tileController.getVariTile(req, res);
});

router.get('/:tiffId/:z/:x/:y', (req, res) => tileController.getVariTile(req, res));

export default router;
