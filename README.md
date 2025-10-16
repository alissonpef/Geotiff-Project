# Projeto de Tiles GeoTIFF (TypeScript)

API REST em TypeScript para servir tiles de arquivos GeoTIFF, com cache em memória, cálculo do índice VARI e endpoints para gerenciar múltiplos GeoTIFFs.

## 🚀 Tecnologias e Bibliotecas

### Linguagens e Runtime
- **TypeScript** (ES2022, modo strict)
- **Node.js** (ES modules, "type": "module")

### Principais Frameworks e Libs
- **express** (v5.1.0): Servidor HTTP e roteamento
- **geotiff** (v2.1.4): Leitura e acesso a rasters em arquivos GeoTIFF
- **sharp** (v0.34.4): Processamento e codificação de imagens (PNG/JPEG/WebP)
- **global-mercator** (v3.1.0): Conversão de tiles (Z/X/Y) para bounding boxes WGS84
- **proj4** (v2.19.10): Reprojeção de coordenadas entre sistemas (EPSG)

### Testes
- **jest** + **ts-jest**: Testes unitários e de integração
- **supertest**: Testes de endpoints HTTP

### Ferramentas de Desenvolvimento
- **tsx**: Execução de TypeScript sem build prévio
- **typescript** (v5.9.3)

## 📁 Estrutura do Projeto

```
src/
  index.ts                 # Bootstrap do servidor (CORS, rotas, inicialização)
  controllers/             # Controllers para GeoTIFFs e tiles
    GeoTiffController.ts   # Gerenciamento de arquivos GeoTIFF
    TileController.ts      # Geração de tiles RGB e VARI
  routes/                  # Rotas REST
    geotiffRoutes.ts       # Rotas de gerenciamento de GeoTIFFs
    tileRoutes.ts          # Rotas de tiles RGB
    variRoutes.ts          # Rotas de tiles VARI
    index.ts               # Agregador de rotas
  services/                # Lógica de negócio
    GeoTiffManager.ts      # Cache e carregamento de GeoTIFFs
    TileService.ts         # Geração e processamento de tiles
  types/                   # Tipos TypeScript compartilhados
    index.ts               # Definições de tipos (TileParams, TileOptions, etc.)
  utils/                   # Utilitários
    tileUtils.ts           # Conversão de coordenadas, validação, auto-correção de zoom
    variUtils.ts           # Cálculo do índice VARI
data/
  odm_orthophoto.tif      # GeoTIFF de exemplo
scripts/
  test-tile.js             # Script para testar geração de tiles localmente
tests/
  core.test.ts             # Testes de integração focados
img/                       # Pasta de saída para tiles de teste (ignorada no git)
```

## 🌐 Endpoints Principais

### Health Check
- **GET** `/health`
  - Retorna: `{ healthy: true, uptime: <segundos> }`

### Gerenciamento de GeoTIFFs
**Arquivo:** `src/routes/geotiffRoutes.ts`

- **GET** `/geotiffs`
  - Lista todos os arquivos `.tif`/`.tiff` no diretório de dados
  
- **GET** `/geotiffs/loaded`
  - Lista arquivos GeoTIFF atualmente carregados no cache
  
- **POST** `/geotiffs/load`
  - Body: `{ idOrPath: string }`
  - Carrega um GeoTIFF específico no cache
  
- **DELETE** `/geotiffs/:id`
  - Remove um GeoTIFF do cache

### Tiles RGB
**Arquivo:** `src/routes/tileRoutes.ts`

- **GET** `/tile/:tiffId/:z/:x/:y?size=<tamanho>`
  - Retorna tile PNG com as bandas RGB do GeoTIFF
  - **Tamanho padrão:** 256×256 pixels
  - **Tamanhos suportados:** Qualquer tamanho pode ser especificado via query param `?size=512`
  - Exemplo: `/tile/odm_orthophoto/20/381004/585533?size=512`

### Tiles VARI
**Arquivo:** `src/routes/variRoutes.ts`

- **GET** `/vari/:tiffId/:z/:x/:y?size=<tamanho>`
  - Retorna tile PNG com colormap baseado no índice VARI
  - **Tamanho padrão:** 256×256 pixels
  - **Fórmula VARI:** `(Verde - Vermelho) / (Verde + Vermelho - Azul)`
  - **Colormap:** Vermelho (baixo) → Amarelo (médio) → Verde (alto)
  - Exemplo: `/vari/odm_orthophoto/20/381004/585533?size=512`

### 📝 Notas Importantes

- **tiffId:** Pode ser um nome de arquivo presente em `DATA_DIR` (com ou sem extensão `.tif`) ou um caminho absoluto.
- **Coordenadas:** A API usa o padrão **XYZ (Slippy Map)**. Se seu cliente usa TMS, converta o Y usando: `y_xyz = (2^z - 1) - y_tms`
- **Auto-correção de Zoom:** O servidor detecta automaticamente quando as coordenadas X/Y pertencem ao nível `z-1` e ajusta (útil para corrigir erros comuns de geradores web de tiles).
- **Reprojeção:** Conversão automática entre WGS84 (EPSG:4326) e o sistema de coordenadas do GeoTIFF usando `proj4`.

## ⚙️ Configuração

Variáveis de ambiente (veja `.env.example`):

- **PORT**: Porta do servidor (padrão: `3001`)
- **DATA_DIR**: Diretório onde os GeoTIFFs estão localizados (padrão: `./data`)
- **CACHE_AGE_MINUTES**: Tempo de limpeza do cache em minutos (padrão: `60`)
- **CORS_ORIGIN**: Origem permitida para CORS (padrão: `*`)

Crie um arquivo `.env` na raiz do projeto para sobrescrever os valores padrão, se necessário.

## 📦 Instalação

1. **Instale as dependências:**

```bash
npm install
```

2. **Configure os dados:**
   - Certifique-se de ter pelo menos um arquivo `.tif` no diretório apontado por `DATA_DIR` (padrão: `./data`)
   - Exemplo: `data/odm_orthophoto.tif`

## 🏃 Execução

### Modo Desenvolvimento (hot-reload com tsx):

```bash
npm run dev
```

### Modo Produção (sem watch):

```bash
npm start
```

Por padrão, o servidor inicia em: **http://localhost:3001**

## 🧪 Testes

### Executar todos os testes:

```bash
npm test
```

### Modo watch:

```bash
npm run test:watch
```

## 🔧 Scripts de Desenvolvedor (Teste Rápido)

O projeto inclui scripts auxiliares em `scripts/` para facilitar testes locais durante o desenvolvimento.

### `scripts/test-tile.js`

Solicita um único tile do servidor local e salva o PNG na pasta `img/` do projeto.

**Características:**
- Cria automaticamente a pasta `img/` se não existir
- Nomeia o arquivo como: `tile-z{z}-x{x}-y{y}.png`
- Configura parâmetros de tile editáveis no próprio script

**Como usar:**

```bash
# 1. Inicie o servidor em um terminal separado
npm start

# 2. Execute o script de teste (a partir da raiz do projeto)
npm run test-tile

# 3. A saída será salva em: ./img/tile-z{z}-x{x}-y{y}.png
```

**Exemplo de uso:**
- Edite `scripts/test-tile.js` para ajustar os parâmetros:
  ```javascript
  const tileParams = {
      tiffId: 'odm_orthophoto',
      z: 22,    
      x: 762005,     
      y: 1171062,    
      size: 512
  };
  ```
- Execute `npm run test-tile`
- Verifique o resultado em `img/tile-z22-x762005-y1171062.png`

### 📌 Observações sobre Scripts

- Os scripts esperam coordenadas de tile no formato **Z/X/Y (padrão XYZ/Slippy Map)**
- Demonstram um fluxo comum: converter lon/lat → tile externamente, depois chamar a API
- Úteis para validar visualmente tiles antes de integrar com aplicações

## 🔍 Como Funciona (Resumo Técnico)

### Arquitetura

1. **GeoTiffManager** (`src/services/GeoTiffManager.ts`)
   - Gerencia cache em memória de arquivos GeoTIFF
   - Limpeza periódica baseada em tempo (configurável via `CACHE_AGE_MINUTES`)
   - Suporte para múltiplos arquivos simultâneos

2. **TileService** (`src/services/TileService.ts`)
   - Lê rasters (R, G, B) baseado em bounding box calculada a partir de Z/X/Y
   - Gera tiles RGB ou VARI
   - Codifica com `sharp` (PNG, JPEG, WebP)
   - Reprojeção automática entre sistemas de coordenadas (WGS84 ↔ EPSG do GeoTIFF)

3. **tileUtils** (`src/utils/tileUtils.ts`)
   - **getTileBBoxWGS84**: Converte Z/X/Y → [minLon, minLat, maxLon, maxLat] em WGS84 usando `global-mercator`
   - **autoCorrectZoom**: Detecta e corrige automaticamente quando coordenadas pertencem a `z-1`
   - **validateTileParams**: Valida se coordenadas de tile são válidas para o zoom especificado

4. **Auto-correção de Zoom**
   - Se uma requisição tem coordenadas `z/x/y` que parecem pertencer ao nível `z-1` (erro comum em alguns geradores de tiles web)
   - O serviço tenta `z-1` automaticamente
   - Se os tiles resultantes estão dentro da cobertura do GeoTIFF, usa `z-1`
   - Registra um aviso no console quando isso acontece
   - Exemplo: requisição com `z=21, x=381004, y=585533` → auto-corrigido para `z=20`

5. **Reprojeção e Window Reading**
   - Converte bbox WGS84 → sistema de coordenadas do GeoTIFF (usando `proj4`)
   - Calcula janela de pixels (window) correspondente à bbox
   - Lê apenas os pixels necessários (evita carregar o raster inteiro)
   - Redimensiona e codifica a imagem no tamanho de tile solicitado

### Fluxo de Geração de Tile

```
Requisição (z/x/y) 
  ↓
Validação de parâmetros
  ↓
Auto-correção de zoom (se necessário)
  ↓
Conversão Z/X/Y → BBox WGS84
  ↓
Reprojeção BBox → CRS do GeoTIFF
  ↓
BBox → Janela de pixels
  ↓
Leitura de rasters (window)
  ↓
Processamento (RGB ou VARI)
  ↓
Codificação com Sharp
  ↓
Retorno PNG/JPEG/WebP
```

## ⚠️ Limitações e Problemas Conhecidos

### 1. Normalização de Bandas Raster
- O `TileService` atual assume bandas de 8 bits (Uint8)
- GeoTIFFs com bandas de 16 bits ou ponto flutuante podem produzir imagens incorretas ou artefatos visuais
- **Solução futura:** Adicionar etapa de normalização (rescaling para 0–255) para uso em produção

### 2. Convenções de Coordenadas de Tile
- A API usa coordenadas de tile **XYZ** (conforme retornadas por `global-mercator`)
- Se seu cliente usa coordenadas **TMS**, você deve converter o Y antes de chamar a API:
  ```
  y_xyz = (2^z - 1) - y_tms
  ```

### 3. Política de Cache
- Cache atual usa expiração simples baseada em tempo
- **Para produção, considere:**
  - Evição LRU (Least Recently Used) baseada em tamanho de memória
  - Guards de concorrência para evitar carregamentos duplicados
  - Persistência em disco para grandes volumes

### 4. I/O de Arquivo Síncrono
- `GeoTiffManager` usa operações de arquivo síncronas
- **Para alta concorrência:** Migrar para `fs.promises` (operações assíncronas)

### 5. Parâmetro `rescale`
- Atualmente não implementado
- Necessário para normalização linear de valores (ex: `rescale=0,254`)
- Planejado para versões futuras