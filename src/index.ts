import express, { type Request, type Response } from 'express';
import path from 'path';
import { loadTiff } from './tiffLoader.js';
import { handleTileRequest, handleDebugTileRequest } from './tileHandler.js';
import { handleVariRequest } from './variHandler.js'; 

const app = express();
const PORT = 3001;

async function startServer() {
    console.log("Iniciando a API GeoTIFF REST em TypeScript...");

    try {
        // Tenta carregar o GeoTIFF no boot da aplicação
        await loadTiff();
        console.log("✅ GeoTIFF e primeira imagem carregados com sucesso!");
    } catch (error) {
        console.error("❌ ERRO FATAL na inicialização do GeoTIFF:", (error as Error).message);
        // Em caso de falha na leitura, o servidor não deve subir.
        process.exit(1); 
    }

    // Habilita CORS para permitir requisições de páginas HTML
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.get('/', (req: Request, res: Response) => {
        res.status(200).json({ 
            status: 'API Rodando', 
            tiff_status: 'Carregado',
            message: 'Rotas implementadas: /tile/:z/:x/:y, /vari/:z/:x/:y, /debug-tile',
            pages: {
                visualizar_debug: 'http://localhost:3001/visualizar',
                mapa_teste: 'http://localhost:3001/mapa'
            }
        });
    });
    
    // Rotas para servir páginas HTML
    app.get('/visualizar', (req: Request, res: Response) => {
        res.sendFile(path.resolve('./src/visualizar_debug.html'));
    });

    app.get('/mapa', (req: Request, res: Response) => {
        res.sendFile(path.resolve('./src/mapa_teste.html'));
    });
    
    app.get('/debug-tile', handleDebugTileRequest); // <-- ROTA DE TESTE AQUI

    // ROTA 1: Visualização Direta RGB
    app.get('/tile/:z/:x/:y', handleTileRequest); 

    // ROTA 2: Mapa de Calor VARI
    app.get('/vari/:z/:x/:y', handleVariRequest); 

    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
}

startServer();