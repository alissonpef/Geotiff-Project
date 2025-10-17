import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDir, '..');
const outDir = path.join(projectRoot, 'img');
fs.mkdirSync(outDir, { recursive: true });

console.log('🌿 Teste de Índices Espectrais Multiespectrais\n');

const tileParams = {
    tiffId: process.env.TEST_TIFFID || process.env.DEFAULT_GEOTIFF || 'odm_orthophoto',
    z: parseInt(process.env.TEST_Z || '20', 10),
    x: parseInt(process.env.TEST_X || '381004', 10),
    y: parseInt(process.env.TEST_Y || '585533', 10),
    size: parseInt(process.env.TEST_SIZE || '512', 10)
};

const tests = [
    {
        name: 'NDVI',
        description: 'Normalized Difference Vegetation Index',
        query: `indexName=NDVI&size=${tileParams.size}`,
        filename: 'ndvi.png'
    },
    {
        name: 'EVI',
        description: 'Enhanced Vegetation Index',
        query: `indexName=EVI&size=${tileParams.size}&colormap=RdYlGn`,
        filename: 'evi.png'
    },
    {
        name: 'NDWI',
        description: 'Normalized Difference Water Index',
        query: `indexName=NDWI&size=${tileParams.size}&colormap=RdYlBu`,
        filename: 'ndwi.png'
    },
    {
        name: 'Custom',
        description: 'Equação customizada: (green - red) / (green + red)',
        query: `equation=(green-red)/(green%2Bred)&size=${tileParams.size}&colormap=viridis`,
        filename: 'custom_equation.png'
    },
];

async function testIndex(test) {
    const url = `/index/${tileParams.tiffId}/${tileParams.z}/${tileParams.x}/${tileParams.y}?${test.query}`;
    const outPath = path.join(outDir, test.filename);

    console.log(`📊 Testando: ${test.name}`);
    console.log(`   Descrição: ${test.description}`);
    console.log(`   URL: http://localhost:3001${url}`);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: url,
            method: 'GET',
            timeout: 60000
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

async function testListIndices() {
    console.log('📋 Listando índices disponíveis...\n');
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/index/list',
            method: 'GET',
            timeout: 10000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    console.log(`   ✅ Total de índices: ${result.data.count}`);
                    result.data.indices.forEach(idx => {
                        console.log(`   • ${idx.name}: ${idx.equation}`);
                    });
                    console.log('');
                    resolve();
                } else {
                    console.log(`   ❌ Erro: ${res.statusCode}\n`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function runTests() {
    try {
        await testListIndices();

        for (const test of tests) {
            await testIndex(test);
        }

        console.log('🎉 Todos os testes concluídos!');
        console.log(`📁 Arquivos salvos em: ${outDir}`);
        
    } catch (error) {
        console.error('❌ Erro durante execução dos testes:', error.message);
        process.exit(1);
    }
}

runTests();
