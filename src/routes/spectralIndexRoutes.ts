import { Router } from 'express';
import spectralIndexController from '../controllers/SpectralIndexController.js';

const router = Router();

router.get('/list', (req, res) => spectralIndexController.listIndices(req, res));
router.get('/colormaps', (req, res) => spectralIndexController.listColormaps(req, res));
router.get('/info/:indexName', (req, res) => spectralIndexController.getIndexInfo(req, res));

router.get('/:z/:x/:y', (req, res) => {
    (req.params as any).tiffId = 'default';
    spectralIndexController.getSpectralIndexTile(req, res);
});

router.get('/:tiffId/:z/:x/:y', (req, res) => spectralIndexController.getSpectralIndexTile(req, res));

export default router;
