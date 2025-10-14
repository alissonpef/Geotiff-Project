import path from 'path';

/**
 * Configurações centralizadas da aplicação
 * Similar ao sistema Python com variáveis de ambiente
 */

interface AppConfig {
    server: {
        port: number;
        host: string;
        environment: 'development' | 'production' | 'test';
    };
    storage: {
        dataDir: string;
        mediaDir: string;
        tempDir: string;
    };
    geotiff: {
        maxCacheSize: number; // MB
        maxCacheAge: number; // minutos
        tileSize: number;
        maxZoom: number;
    };
    cors: {
        enabled: boolean;
        origin: string;
    };
}

const config: AppConfig = {
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.HOST || '0.0.0.0',
        environment: (process.env.NODE_ENV as any) || 'development',
    },
    storage: {
        // Similar ao WO_MEDIA_DIR do Python
        dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
        mediaDir: process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'),
        tempDir: process.env.TEMP_DIR || path.resolve(process.cwd(), 'temp'),
    },
    geotiff: {
        maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE_MB || '2048', 10),
        // Support either MAX_CACHE_AGE_HOURS (from .env.example) or CACHE_AGE_MINUTES.
        // If hours is provided, convert to minutes. Otherwise fall back to minutes.
        maxCacheAge: (() => {
            if (process.env.MAX_CACHE_AGE_HOURS) {
                const h = parseInt(process.env.MAX_CACHE_AGE_HOURS, 10);
                if (!Number.isNaN(h)) return h * 60;
            }
            return parseInt(process.env.CACHE_AGE_MINUTES || '60', 10);
        })(),
        tileSize: parseInt(process.env.TILE_SIZE || '256', 10),
        maxZoom: parseInt(process.env.MAX_ZOOM || '22', 10),
    },
    cors: {
        enabled: process.env.CORS_ENABLED !== 'false',
        origin: process.env.CORS_ORIGIN || '*',
    },
};

export default config;
