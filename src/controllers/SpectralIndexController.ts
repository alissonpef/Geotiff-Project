import type { Request, Response } from 'express';
import tileService from '../services/TileService.js';
import type { TileParams, SpectralIndexOptions } from '../types/index.js';
import { validateTileParams } from '../utils/tileUtils.js';
import { getIndexDefinition, listAvailableIndices } from '../utils/spectralIndices.js';
import { listColorMaps } from '../utils/colorMaps.js';

function resolveTiffId(tiffId?: string): string {
    if (!tiffId || tiffId === 'default' || tiffId === '_default') {
        return process.env.DEFAULT_GEOTIFF || 'odm_orthophoto.tif';
    }
    return tiffId;
}

class SpectralIndexController {
    public async getSpectralIndexTile(req: Request, res: Response): Promise<void> {
        try {
            const { tiffId, z, x, y } = req.params;
            const { equation, indexName, colormap, size, rescale, percentiles } = req.query;

            const resolvedTiffId = resolveTiffId(tiffId);

            const params: TileParams = {
                z: parseInt(z, 10),
                x: parseInt(x, 10),
                y: parseInt(y, 10),
            };

            if (!validateTileParams(params.z, params.x, params.y)) {
                res.status(400).json({
                    success: false,
                    error: {
                        error: 'InvalidParams',
                        message: 'Invalid tile coordinates',
                        statusCode: 400,
                    },
                });
                return;
            }

            if (!equation && !indexName) {
                res.status(400).json({
                    success: false,
                    error: {
                        error: 'MissingParameter',
                        message: 'Either "equation" or "indexName" query parameter must be provided',
                        statusCode: 400,
                        details: {
                            availableIndices: listAvailableIndices().map(idx => idx.name),
                        },
                    },
                });
                return;
            }

            const options: SpectralIndexOptions = {
                equation: equation as string | undefined,
                indexName: indexName as string | undefined,
                colormap: colormap as string | undefined,
                size: size ? parseInt(size as string, 10) : undefined,
            };

            if (rescale) {
                const rescaleParts = (rescale as string).split(',').map(v => parseFloat(v.trim()));
                if (rescaleParts.length === 2 && rescaleParts.every(v => !isNaN(v))) {
                    options.rescale = [rescaleParts[0], rescaleParts[1]];
                }
            }

            if (percentiles) {
                const percentileParts = (percentiles as string).split(',').map(v => parseFloat(v.trim()));
                if (percentileParts.length === 2 && percentileParts.every(v => !isNaN(v))) {
                    options.percentiles = [percentileParts[0], percentileParts[1]];
                }
            }

            const pngBuffer = await tileService.generateSpectralIndexTile(resolvedTiffId, params, options);
            res.contentType('image/png').send(pngBuffer);
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error('[SpectralIndexController] Error:', errorMessage);
            
            res.status(500).json({
                success: false,
                error: {
                    error: 'TileGenerationError',
                    message: errorMessage,
                    statusCode: 500,
                },
            });
        }
    }

    public async listIndices(req: Request, res: Response): Promise<void> {
        try {
            const indices = listAvailableIndices();
            res.json({
                success: true,
                data: {
                    count: indices.length,
                    indices: indices,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    error: 'ServerError',
                    message: (error as Error).message,
                    statusCode: 500,
                },
            });
        }
    }

    public async getIndexInfo(req: Request, res: Response): Promise<void> {
        try {
            const { indexName } = req.params;
            const indexDef = getIndexDefinition(indexName);

            if (!indexDef) {
                res.status(404).json({
                    success: false,
                    error: {
                        error: 'IndexNotFound',
                        message: `Index '${indexName}' not found`,
                        statusCode: 404,
                        details: {
                            availableIndices: listAvailableIndices().map(idx => ({
                                name: idx.name,
                                equation: idx.equation,
                            })),
                        },
                    },
                });
                return;
            }

            res.json({
                success: true,
                data: indexDef,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    error: 'ServerError',
                    message: (error as Error).message,
                    statusCode: 500,
                },
            });
        }
    }

    public async listColormaps(req: Request, res: Response): Promise<void> {
        try {
            const colormaps = listColorMaps();
            res.json({
                success: true,
                data: {
                    count: colormaps.length,
                    colormaps: colormaps,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    error: 'ServerError',
                    message: (error as Error).message,
                    statusCode: 500,
                },
            });
        }
    }
}

export default new SpectralIndexController();
