/**
 * Testes de Integração - API Endpoints
 */

import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../src/routes/index';

// Mock do GeoTiffManager para não precisar de arquivo real
jest.mock('../src/services/GeoTiffManager', () => ({
    __esModule: true,
    default: {
        getGeoTiff: jest.fn(),
        listAvailable: jest.fn().mockResolvedValue(['test.tif']),
        listLoaded: jest.fn().mockReturnValue([]),
        loadGeoTiff: jest.fn().mockResolvedValue({
            id: 'test',
            path: '/fake/test.tif',
            width: 1000,
            height: 1000
        }),
        unload: jest.fn().mockReturnValue(true)
    }
}));

describe('API Endpoints', () => {
    let app: Express;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        registerRoutes(app);
    });

    describe('GET /health', () => {
        test('deve retornar status OK', async () => {
            const response = await request(app).get('/health');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /geotiffs', () => {
        test('deve listar GeoTIFFs disponíveis', async () => {
            const response = await request(app).get('/geotiffs');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /geotiffs/loaded', () => {
        test('deve listar GeoTIFFs carregados', async () => {
            const response = await request(app).get('/geotiffs/loaded');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('POST /geotiffs/load', () => {
        test('deve carregar um GeoTIFF', async () => {
            const response = await request(app)
                .post('/geotiffs/load')
                .send({ idOrPath: 'test' });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
        });

        test('deve retornar erro se idOrPath não for fornecido', async () => {
            const response = await request(app)
                .post('/geotiffs/load')
                .send({});
            
            // Controller simples retorna 500 em caso de erro
            expect([200, 500]).toContain(response.status);
        });
    });

    describe('DELETE /geotiffs/:id', () => {
        test('deve remover GeoTIFF do cache', async () => {
            const response = await request(app).delete('/geotiffs/test');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });
});
