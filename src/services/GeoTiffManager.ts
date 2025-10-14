/**
 * GeoTiffManager - Gerenciador de múltiplos GeoTIFFs
 * Singleton pattern para cache e gerenciamento de memória
 * Similar ao sistema Python mas com controle de cache
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as GeoTIFF from 'geotiff';
import config from '../config/index.js';
import type { GeoTiffInfo, GeoTiffCacheEntry } from '../types/index.js';

class GeoTiffManager {
    private static instance: GeoTiffManager;
    private cache: Map<string, GeoTiffCacheEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.startCleanupTask();
    }

    /**
     * Singleton instance
     */
    public static getInstance(): GeoTiffManager {
        if (!GeoTiffManager.instance) {
            GeoTiffManager.instance = new GeoTiffManager();
        }
        return GeoTiffManager.instance;
    }

    /**
     * Carrega um GeoTIFF por ID ou path
     * Retorna do cache se já estiver carregado
     */
    public async loadGeoTiff(idOrPath: string): Promise<GeoTiffCacheEntry> {
        // Verifica se já está em cache
        if (this.cache.has(idOrPath)) {
            const entry = this.cache.get(idOrPath)!;
            entry.info.loadedAt = new Date();
            return entry;
        }

        // Resolve path do arquivo
        const filePath = this.resolveTiffPath(idOrPath);

        if (!fs.existsSync(filePath)) {
            throw new Error(`GeoTIFF não encontrado: ${filePath}`);
        }

        // Lê arquivo
        const stats = fs.statSync(filePath);
        const buffer = fs.readFileSync(filePath);
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        );

        // Inicializa GeoTIFF
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();

        // Calcula bounds
        const bbox = image.getBoundingBox();

        // Cria entrada de cache
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

    /**
     * Remove GeoTIFF do cache
     */
    public unload(id: string): boolean {
        if (this.cache.has(id)) {
            this.cache.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Lista todos os GeoTIFFs disponíveis no diretório de dados
     */
    public listAvailable(): string[] {
        const dataDir = config.storage.dataDir;
        
        if (!fs.existsSync(dataDir)) {
            return [];
        }

        const files = fs.readdirSync(dataDir);
        return files.filter(file => 
            file.toLowerCase().endsWith('.tif') || 
            file.toLowerCase().endsWith('.tiff')
        );
    }

    /**
     * Lista GeoTIFFs carregados no cache
     */
    public listLoaded(): GeoTiffInfo[] {
        return Array.from(this.cache.values()).map(entry => entry.info);
    }

    /**
     * Obtém informações de um GeoTIFF sem carregá-lo
     */
    public async getInfo(idOrPath: string): Promise<GeoTiffInfo> {
        // Se já está em cache, retorna info
        if (this.cache.has(idOrPath)) {
            return this.cache.get(idOrPath)!.info;
        }

        // Caso contrário, lê apenas metadados básicos
        const filePath = this.resolveTiffPath(idOrPath);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`GeoTIFF não encontrado: ${filePath}`);
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

    /**
     * Limpa cache de GeoTIFFs antigos
     */
    private cleanup(): void {
        const now = new Date();
        const maxAge = config.geotiff.maxCacheAge * 60 * 1000; // minutos -> ms

        for (const [id, entry] of this.cache.entries()) {
            if (entry.info.loadedAt) {
                const age = now.getTime() - entry.info.loadedAt.getTime();
                if (age > maxAge) {
                    this.cache.delete(id);
                }
            }
        }
    }

    /**
     * Inicia tarefa de cleanup periódico
     */
    private startCleanupTask(): void {
        if (this.cleanupInterval) {
            return;
        }

        // Executa cleanup a cada 10 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10 * 60 * 1000);
    }

    /**
     * Resolve path do TIFF (suporta ID ou path completo)
     */
    private resolveTiffPath(idOrPath: string): string {
        // Se é um path absoluto, usa diretamente
        if (path.isAbsolute(idOrPath)) {
            return idOrPath;
        }

        // Se tem extensão .tif/.tiff, assume que é nome de arquivo no dataDir
        if (idOrPath.toLowerCase().endsWith('.tif') || idOrPath.toLowerCase().endsWith('.tiff')) {
            return path.join(config.storage.dataDir, idOrPath);
        }

        // Caso contrário, tenta adicionar .tif
        return path.join(config.storage.dataDir, `${idOrPath}.tif`);
    }

    /**
     * Para o cleanup task (útil para testes)
     */
    public stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

export default GeoTiffManager.getInstance();
