# GeoTIFF Tiles Test Project (TypeScript)

REST API in TypeScript to serve 256x256 tiles from GeoTIFF files, with a simple cache, VARI index calculation and endpoints to manage GeoTIFFs.

## Technologies and libraries

- Languages and runtime
  - TypeScript (ES2022, strict)
  - Node.js (ES modules, "type": "module")

- Main frameworks and libs
  - express: HTTP server and routing
  - geotiff: reading and access to rasters in GeoTIFF files
  - sharp: image processing and encoding (PNG/JPEG/WebP)
  - global-mercator: utilities to convert tiles (Z/X/Y) to WGS84 bounding boxes

- Testing
  - jest + ts-jest: unit and integration tests
  - supertest: HTTP endpoint tests

- Development tools
  - tsx: run TypeScript without building
  - typescript, @types/*

## Project structure

```
src/
  index.ts                 # server bootstrap (demo routes)
  config/                  # centralized configuration (port, directories, cache, CORS)
  controllers/             # controllers for GeoTIFFs and tiles
  routes/                  # REST routes (tile, vari, geotiffs, health)
  services/                # business logic (GeoTiffManager, TileService)
  types/                   # shared types
  utils/                   # utilities (tile bbox, VARI)
data/
  odm_orthophoto.tif      # example GeoTIFF
tests/
  *.test.ts                # jest tests
```

## Endpoints principais

- Health check
  - GET `/health`

- Gerenciamento de GeoTIFFs (`src/routes/geotiffRoutes.ts`)
  - GET `/geotiffs` — list .tif/.tiff files in the data directory
  - GET `/geotiffs/loaded` — list files currently loaded in cache
  - POST `/geotiffs/load` — body: `{ idOrPath: string }` — load into cache
  - DELETE `/geotiffs/:id` — remove from cache

- Tiles RGB (`src/routes/tileRoutes.ts`)
  - GET `/tile/:tiffId/:z/:x/:y` — tile 256x256 PNG (ou outros formatos futuramente)

- Tiles VARI (`src/routes/variRoutes.ts`)
  - GET `/vari/:tiffId/:z/:x/:y` — tile 256x256 PNG com colormap baseado em VARI

Notes:
- The `tiffId` can be a filename present in `DATA_DIR` (with or without extension) or an absolute path.
- Z/X/Y to WGS84 BBOX conversion uses `global-mercator`.
- VARI is calculated as `(G - R) / (G + R - B)`; output is mapped to a simple color scale (red → yellow → green).

## Configuration

Environment variables (see `.env.example`):

- PORT: server port (default 3001)
- DATA_DIR: directory where GeoTIFFs live (default `./data`)
- MEDIA_DIR, TEMP_DIR: auxiliary directories (optional)
- MAX_CACHE_SIZE_MB: cache size limit in MB (default 2048 in code)
- CACHE_AGE_MINUTES: cache cleanup time in minutes (default 60)
- TILE_SIZE: tile size (default 256)
- MAX_ZOOM: maximum zoom supported (default 22)
- CORS_ORIGIN: allowed origin (default `*`)

Create a `.env` file at the project root to override defaults if desired.

## Installation

1) Install dependencies

```bash
npm install
```

2) Ensure there is at least one `.tif` file in the directory pointed by `DATA_DIR` (default `./data`). Example: `data/odm_orthophoto.tif`.

## Run

- Development (hot-reload via tsx):

```bash
npm run dev
```

- Run (no watch):

```bash
npm start
```

By default the server starts at `http://localhost:3001`.

## Tests

Run all tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

## How it works (technical summary)

- `GeoTiffManager` loads GeoTIFF files and keeps a simple in-memory cache with periodic time-based cleanup.
- `TileService` reads rasters (R,G,B) for a bounding box based on Z/X/Y and generates RGB or VARI tiles, encoding them with `sharp`.
- `tileUtils.getTileBBoxWGS84` converts Z/X/Y → [minLon, minLat, maxLon, maxLat] in WGS84 using `global-mercator`.
- The VARI colormap maps values to RGB in a simple way: red (low) → yellow (medium) → green (high).
