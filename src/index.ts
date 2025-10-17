import express from 'express';
import dotenv from 'dotenv';
import tileRoutes from './routes/tileRoutes.js';
import variRoutes from './routes/variRoutes.js';
import spectralIndexRoutes from './routes/spectralIndexRoutes.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const DEFAULT_GEOTIFF = process.env.DEFAULT_GEOTIFF || 'odm_orthophoto.tif';

// CORS simples
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(express.json());

app.use('/tile', tileRoutes);
app.use('/vari', variRoutes);
app.use('/index', spectralIndexRoutes);

app.get('/health', (_req, res) => {
    res.json({ healthy: true, uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`🚀 GeoTIFF Tile Server - http://localhost:${PORT}`);
    console.log(`� Default file: ${DEFAULT_GEOTIFF}`);
    console.log(`\n� Routes:`);
    console.log(`   GET /tile/:z/:x/:y`);
    console.log(`   GET /vari/:z/:x/:y`);
    console.log(`   GET /index/:z/:x/:y?indexName=NDVI`);
});