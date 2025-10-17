export class AppConfig {
    private static instance: AppConfig;
    
    public readonly PORT: number;
    public readonly DATA_DIR: string;
    public readonly CACHE_AGE_MINUTES: number;
    public readonly CORS_ORIGIN: string;
    public readonly DEFAULT_GEOTIFF: string;

    private constructor() {
        this.PORT = parseInt(process.env.PORT || '3001', 10);
        this.DATA_DIR = process.env.DATA_DIR || './data';
        this.CACHE_AGE_MINUTES = parseInt(process.env.CACHE_AGE_MINUTES || '60', 10);
        this.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
        this.DEFAULT_GEOTIFF = process.env.DEFAULT_GEOTIFF || 'odm_orthophoto.tif';
    }

    public static getInstance(): AppConfig {
        if (!AppConfig.instance) {
            AppConfig.instance = new AppConfig();
        }
        return AppConfig.instance;
    }

    public resolveTiffId(tiffId?: string): string {
        if (!tiffId || tiffId === 'default' || tiffId === '_default') {
            return this.DEFAULT_GEOTIFF;
        }
        return tiffId;
    }

    public getInfo(): Record<string, any> {
        return {
            port: this.PORT,
            dataDir: this.DATA_DIR,
            cacheAgeMinutes: this.CACHE_AGE_MINUTES,
            corsOrigin: this.CORS_ORIGIN,
            defaultGeoTiff: this.DEFAULT_GEOTIFF,
        };
    }
}

export default AppConfig.getInstance();
