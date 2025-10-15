import express from 'express';
import { registerRoutes } from './routes/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API GeoTIFF REST - TypeScript',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            geotiffs: '/geotiffs',
            tiles: '/tile/:tiffId/:z/:x/:y',
            vari: '/vari/:tiffId/:z/:x/:y',
        },
        docs: 'https://github.com/alissonpef/Geotiff-Project',
    });
});

registerRoutes(app);

app.listen(PORT, () => {
    console.log(`🚀 GeoTIFF API running at http://localhost:${PORT}`);
    console.log(`📂 Data directory: ${process.env.DATA_DIR || './data'}`);
    console.log(`🌍 CORS origin: ${CORS_ORIGIN}`);
});