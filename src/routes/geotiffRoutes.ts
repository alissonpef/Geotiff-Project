import { Router } from 'express';
import geotiffController from '../controllers/GeoTiffController.js';

const router = Router();

router.get('/', (req, res) => geotiffController.listAvailable(req, res));
router.get('/loaded', (req, res) => geotiffController.listLoaded(req, res));
router.post('/load', (req, res) => geotiffController.loadGeoTiff(req, res));
router.delete('/:id', (req, res) => geotiffController.unloadGeoTiff(req, res));

export default router;
