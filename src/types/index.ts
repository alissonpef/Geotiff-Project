/**
 * Type definitions para a aplicação
 */

import type * as GeoTIFF from 'geotiff';

export interface TileParams {
    z: number;
    x: number;
    y: number;
}

export interface BoundingBox {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
}

export interface GeoTiffInfo {
    id: string;
    path: string;
    width: number;
    height: number;
    bounds?: BoundingBox;
    loaded: boolean;
    loadedAt?: Date;
    sizeBytes: number;
}

export interface GeoTiffCacheEntry {
    instance: GeoTIFF.GeoTIFF;
    image: GeoTIFF.GeoTIFFImage;
    info: GeoTiffInfo;
}

export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
    details?: any;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ErrorResponse;
}

export interface VariOptions {
    minValue?: number;
    maxValue?: number;
}

export interface TileOptions {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
}
