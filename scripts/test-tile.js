import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const tileParams = {
    tiffId: process.env.TEST_TIFFID || process.env.DEFAULT_GEOTIFF || 'odm_orthophoto',
    z: parseInt(process.env.TEST_Z || '22', 10),
    x: parseInt(process.env.TEST_X || '762005', 10),
    y: parseInt(process.env.TEST_Y || '1171062', 10),
    size: parseInt(process.env.TEST_SIZE || '512', 10)
};

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDir, '..');
const outDir = path.join(projectRoot, 'img');
fs.mkdirSync(outDir, { recursive: true });

console.log('🎨 Teste de Tiles RGB e VARI\n');

console.log('📍 Tile parameters:');
console.log(`   Zoom: ${tileParams.z}`);
console.log(`   X: ${tileParams.x}`);
console.log(`   Y: ${tileParams.y}`);
console.log(`   Size: ${tileParams.size}x${tileParams.size}\n`);

async function fetchTile(endpoint, filename, description) {
    const url = `/${endpoint}/${tileParams.tiffId}/${tileParams.z}/${tileParams.x}/${tileParams.y}?size=${tileParams.size}`;
    const outPath = path.join(outDir, filename);

    console.log(`📊 Gerando: ${description}`);
    console.log(`   URL: http://localhost:3001${url}`);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: url,
            method: 'GET',
            timeout: 120000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                const chunks = [];
                
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    fs.writeFileSync(outPath, buffer);
                    
                    console.log(`   ✅ Sucesso! Arquivo: ${outPath}`);
                    console.log(`   📊 Tamanho: ${buffer.length} bytes\n`);
                    resolve();
                });
            } else {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    console.log(`   ❌ Erro (${res.statusCode}):`);
                    console.log(`   ${data}\n`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                });
            }
        });

        req.on('error', (e) => {
            console.error(`   ❌ Erro de requisição: ${e.message}\n`);
            reject(e);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('   ❌ Timeout\n');
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function runTests() {
    try {
        const tests = [
            {
                endpoint: 'tile',
                filename: `tile-rgb-z${tileParams.z}-x${tileParams.x}-y${tileParams.y}.png`,
                description: 'Tile RGB'
            },
            {
                endpoint: 'vari',
                filename: `tile-vari-z${tileParams.z}-x${tileParams.x}-y${tileParams.y}.png`,
                description: 'Tile VARI (Vegetation Index)'
            }
        ];

        for (const test of tests) {
            await fetchTile(test.endpoint, test.filename, test.description);
        }

        console.log('🎉 Todos os tiles gerados com sucesso!');
        console.log(`📁 Arquivos salvos em: ${outDir}`);
        
    } catch (error) {
        console.error('❌ Erro durante execução dos testes:', error.message);
        process.exit(1);
    }
}

runTests();
