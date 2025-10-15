import * as fs from 'node:fs';
import * as path from 'node:path';
import * as GeoTIFF from 'geotiff';
import type { GeoTiffInfo, GeoTiffCacheEntry } from '../types/index.js';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const CACHE_AGE_MINUTES = parseInt(process.env.CACHE_AGE_MINUTES || '60', 10);

class GeoTiffManager {
    private static instance: GeoTiffManager;
    private cache: Map<string, GeoTiffCacheEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.startCleanupTask();
    }

    public static getInstance(): GeoTiffManager {
        if (!GeoTiffManager.instance) {
            GeoTiffManager.instance = new GeoTiffManager();
        }
        return GeoTiffManager.instance;
    }

    public async loadGeoTiff(idOrPath: string): Promise<GeoTiffCacheEntry> {
        if (this.cache.has(idOrPath)) {
            const entry = this.cache.get(idOrPath)!;
            entry.info.loadedAt = new Date();
            return entry;
        }

        const filePath = this.resolveTiffPath(idOrPath);

        if (!fs.existsSync(filePath)) {
            throw new Error(`GeoTIFF not found: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        const buffer = fs.readFileSync(filePath);
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        );

        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();

        const bbox = image.getBoundingBox();

        const info: GeoTiffInfo = {
            id: idOrPath,
            path: filePath,
            width: image.getWidth(),
            height: image.getHeight(),
            bounds: bbox ? {
                minLon: bbox[0],
                minLat: bbox[1],
                maxLon: bbox[2],
                maxLat: bbox[3],
            } : undefined,
            loaded: true,
            loadedAt: new Date(),
            sizeBytes: stats.size,
        };

        const entry: GeoTiffCacheEntry = {
            instance: tiff,
            image,
            info,
        };

        this.cache.set(idOrPath, entry);

        return entry;
    }

    public unload(id: string): boolean {
        if (this.cache.has(id)) {
            this.cache.delete(id);
            return true;
        }
        return false;
    }

    public listAvailable(): string[] {
        if (!fs.existsSync(DATA_DIR)) {
            return [];
        }

        const files = fs.readdirSync(DATA_DIR);
        return files.filter(file => 
            file.toLowerCase().endsWith('.tif') || 
            file.toLowerCase().endsWith('.tiff')
        );
    }

    public listLoaded(): GeoTiffInfo[] {
        return Array.from(this.cache.values()).map(entry => entry.info);
    }

    public async getInfo(idOrPath: string): Promise<GeoTiffInfo> {
        if (this.cache.has(idOrPath)) {
            return this.cache.get(idOrPath)!.info;
        }

        const filePath = this.resolveTiffPath(idOrPath);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`GeoTIFF not found: ${filePath}`);
        }

        const stats = fs.statSync(filePath);

        return {
            id: idOrPath,
            path: filePath,
            width: 0,
            height: 0,
            loaded: false,
            sizeBytes: stats.size,
        };
    }

    private cleanup(): void {
        const now = new Date();
        const maxAge = CACHE_AGE_MINUTES * 60 * 1000;

        for (const [id, entry] of this.cache.entries()) {
            if (entry.info.loadedAt) {
                const age = now.getTime() - entry.info.loadedAt.getTime();
                if (age > maxAge) {
                    this.cache.delete(id);
                }
            }
        }
    }

    private startCleanupTask(): void {
        if (this.cleanupInterval) {
            return;
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10 * 60 * 1000);
    }

    private resolveTiffPath(idOrPath: string): string {
        if (path.isAbsolute(idOrPath)) {
            return idOrPath;
        }

        if (idOrPath.toLowerCase().endsWith('.tif') || idOrPath.toLowerCase().endsWith('.tiff')) {
            return path.join(DATA_DIR, idOrPath);
        }

        return path.join(DATA_DIR, `${idOrPath}.tif`);
    }

    public stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

export default GeoTiffManager.getInstance();
