import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const tileParams = {
    tiffId: 'odm_orthophoto',
    z: 22,    
    x: 762005,     
    y: 1171062,    
    size: 512
};

const url = `/tile/${tileParams.tiffId}/${tileParams.z}/${tileParams.x}/${tileParams.y}?size=${tileParams.size}`;
const filename = `tile-z${tileParams.z}-x${tileParams.x}-y${tileParams.y}.png`;
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDir, '..');
const outDir = path.join(projectRoot, 'img');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, filename);

console.log('📍 Tile parameters:');
console.log(`   Zoom: ${tileParams.z}`);
console.log(`   X: ${tileParams.x}`);
console.log(`   Y: ${tileParams.y}`);
console.log(`   Size: ${tileParams.size}x${tileParams.size}\n`);

console.log('🔗 Local service URL:');
console.log(`   http://localhost:3001${url}\n`);

const options = {
    hostname: 'localhost',
    port: 3001,
    path: url,
    method: 'GET',
    timeout: 60000
};

const req = http.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);
    console.log(`📋 Content-Type: ${res.headers['content-type']}`);
    
    if (res.statusCode === 200) {
        const chunks = [];
        
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        
        res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(outPath, buffer);
            
            console.log(`\n✅ Tile generated successfully!`);
            console.log(`📁 File: ${outPath}`);
            console.log(`📊 Size: ${buffer.length} bytes`);
            console.log(`📐 Dimensions: ${tileParams.size}x${tileParams.size} pixels`);
        });
    } else {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(`\n❌ Error response:`);
            console.log(data);
        });
    }
});

req.on('error', (e) => {
    console.error(`\n❌ Request error: ${e.message}`);
});

req.on('timeout', () => {
    req.destroy();
    console.error('\n❌ Request timeout');
});

req.end();
