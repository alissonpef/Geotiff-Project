# Project Teste — API GeoTIFF Tiles (TypeScript)

API REST em TypeScript para servir tiles 256x256 a partir de arquivos GeoTIFF, com cache simples, cálculo de índice VARI e endpoints para gerenciamento dos GeoTIFFs.

## Tecnologias e bibliotecas

- Linguagens e runtime
  - TypeScript (ES2022, strict)
  - Node.js (módulos ES, "type": "module")

- Frameworks e libs principais
  - express: servidor HTTP e roteamento
  - geotiff: leitura e acesso a rasters de arquivos GeoTIFF
  - sharp: processamento e codificação de imagens (PNG/JPEG/WebP)
  - global-mercator: utilitários para conversão de tiles (Z/X/Y) em bounding boxes WGS84

- Testes
  - jest + ts-jest: testes unitários e de integração
  - supertest: testes HTTP dos endpoints

- Ferramentas de desenvolvimento
  - tsx: executar TypeScript sem build
  - typescript, @types/*

## Estrutura do projeto

```
src/
  index.ts                 # bootstrap do servidor (rotas de demonstração)
  config/                  # configuração centralizada (porta, diretórios, cache, CORS)
  controllers/             # controladores para GeoTIFFs e tiles
  routes/                  # rotas REST (tile, vari, geotiffs, health)
  services/                # lógica de negócio (GeoTiffManager, TileService)
  types/                   # tipos compartilhados
  utils/                   # utilitários (tile bbox, VARI)
data/
  odm_orthophoto.tif      # exemplo de GeoTIFF
tests/
  *.test.ts                # testes com jest
```

Observação: O `src/index.ts` presente é um bootstrap simples com rotas demonstrativas (`/tile/:z/:x/:y`, `/vari/:z/:x/:y`, páginas HTML). As rotas REST completas estão sob `src/routes` e podem ser registradas via `registerRoutes` caso você queira usar a API modularizada.

## Endpoints principais

- Health check
  - GET `/health`

- Gerenciamento de GeoTIFFs (`src/routes/geotiffRoutes.ts`)
  - GET `/geotiffs` — lista arquivos .tif/.tiff no diretório de dados
  - GET `/geotiffs/loaded` — lista arquivos carregados em cache
  - POST `/geotiffs/load` — body: `{ idOrPath: string }` — carrega no cache
  - DELETE `/geotiffs/:id` — remove do cache

- Tiles RGB (`src/routes/tileRoutes.ts`)
  - GET `/tile/:tiffId/:z/:x/:y` — tile 256x256 PNG (ou outros formatos futuramente)

- Tiles VARI (`src/routes/variRoutes.ts`)
  - GET `/vari/:tiffId/:z/:x/:y` — tile 256x256 PNG com colormap baseado em VARI

Notas:
- O `tiffId` pode ser um nome de arquivo presente em `DATA_DIR` (com ou sem extensão) ou um path absoluto.
- A conversão de Z/X/Y para BBOX WGS84 usa `global-mercator`.
- O VARI é calculado como `(G - R) / (G + R - B)`; a saída é mapeada para uma escala de cores simples (vermelho → amarelo → verde).

## Requisitos

- Node.js 18+ (recomendado) — necessário para `sharp` e ESM
- Dependências nativas do `sharp` (as prebuilds costumam funcionar em Linux)

## Configuração

Variáveis de ambiente (veja `.env.example`):

- PORT: porta do servidor (padrão 3001)
- DATA_DIR: diretório onde ficam os GeoTIFFs (padrão `./data`)
- MEDIA_DIR, TEMP_DIR: diretórios auxiliares (opcionais)
- MAX_CACHE_SIZE_MB: limite de cache em MB (padrão 2048 no código)
- CACHE_AGE_MINUTES: tempo para limpeza do cache em minutos (padrão 60)
- TILE_SIZE: tamanho do tile (padrão 256)
- MAX_ZOOM: zoom máximo suportado (padrão 22)
- CORS_ORIGIN: origem permitida (padrão `*`)

Crie um arquivo `.env` na raiz para sobrescrever os padrões, se desejar.

## Instalação

1) Instale as dependências

```bash
npm install
```

2) Garanta que haja pelo menos um arquivo `.tif` dentro do diretório apontado por `DATA_DIR` (padrão `./data`). Exemplo: `data/odm_orthophoto.tif`.

## Execução

- Desenvolvimento (hot-reload via tsx):

```bash
npm run dev
```

- Execução direta (sem watch):

```bash
npm start
```

Por padrão o servidor sobe em `http://localhost:3001`.

## Testes

Rodar todos os testes:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Cobertura:

```bash
npm run test:coverage
```

Os testes cobrem:
- Geração/validação de tiles 256x256 com `sharp`
- Cálculo e normalização do VARI
- Conversões de tiles Web Mercator
- Endpoints REST (via `supertest`)

## Como funciona (resumo técnico)

- `GeoTiffManager` carrega arquivos GeoTIFF e mantém um cache simples em memória, com limpeza periódica baseada em tempo.
- `TileService` lê rasters (R,G,B) por bounding box de acordo com Z/X/Y e gera tiles RGB ou VARI, codificando com `sharp`.
- `tileUtils.getTileBBoxWGS84` converte Z/X/Y → [minLon, minLat, maxLon, maxLat] em WGS84 usando `global-mercator`.
- O colormap do VARI mapeia valores para RGB de forma simples: vermelho (baixo) → amarelo (médio) → verde (alto).
