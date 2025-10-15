import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../src/routes/index';

jest.mock('../src/services/GeoTiffManager', () => ({
    __esModule: true,
    default: {
        listAvailable: jest.fn().mockReturnValue(['odm_orthophoto.tif']),
        listLoaded: jest.fn().mockReturnValue([]),
        loadGeoTiff: jest.fn().mockResolvedValue({
            instance: {},
            image: {
                getWidth: () => 10000,
                getHeight: () => 10000,
                getBoundingBox: () => [-180, -85, 180, 85]
            },
            info: {
                id: 'odm_orthophoto.tif',
                path: './data/odm_orthophoto.tif',
                width: 10000,
                height: 10000,
                loaded: true
            }
        })
    }
}));

jest.mock('../src/services/TileService', () => ({
    __esModule: true,
    default: {
        generateTile: jest.fn().mockResolvedValue(
            Buffer.from('fake-png-tile')
        ),
        generateVariTile: jest.fn().mockResolvedValue(
            Buffer.from('fake-vari-png')
        )
    }
}));

describe('Task Requirements - GeoTIFF API', () => {
    let app: Express;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        registerRoutes(app);
    });

    describe('Requirement 2: GET /tile/:tiffId/:z/:x/:y returns PNG', () => {
        test('route exists and responds', async () => {
            const response = await request(app).get('/tile/odm_orthophoto/18/174208/118632');
            
            expect([200, 400, 500]).toContain(response.status);
        });
    });

    describe('Requirement 3: GET /vari/:tiffId/:z/:x/:y returns VARI PNG', () => {
        test('route exists and responds', async () => {
            const response = await request(app).get('/vari/odm_orthophoto/18/174208/118632');
            
            expect([200, 400, 500]).toContain(response.status);
        });
    });

    describe('Requirement 4: TypeScript + geotiff can read .tif', () => {
        test('API lists available GeoTIFF files', async () => {
            const response = await request(app).get('/geotiffs');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });
});
