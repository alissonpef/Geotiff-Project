# 🏗️ Arquitetura do Project-geotiff

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Fluxo de Processamento](#fluxo-de-processamento)
- [Componentes Principais](#componentes-principais)
- [Diagramas](#diagramas)

---

## 🎯 Visão Geral

O **Project-geotiff** é um servidor REST em TypeScript/Node.js especializado em processar e servir tiles de imagens GeoTIFF multiespectrais (drones/satélites) com capacidades avançadas de:

- ✅ **Leitura de GeoTIFF**: Suporte a imagens com múltiplas bandas espectrais
- ✅ **Geração de Tiles XYZ**: Sistema de tiles compatível com Leaflet/OpenLayers
- ✅ **Índices Espectrais**: Cálculo dinâmico (NDVI, NDWI, EVI, etc.)
- ✅ **Parser de Equações**: Interpretador matemático para equações customizadas
- ✅ **Color Maps**: 12 paletas de cores para visualização
- ✅ **Reprojeção**: Conversão automática entre sistemas de coordenadas

---

## 🔄 Fluxo de Processamento

### Diagrama de Sequência - Requisição de Tile

```mermaid
sequenceDiagram
    participant Client as Cliente Web
    participant API as Express API
    participant Controller as Controller
    participant TileService as TileService
    participant GeoTiffMgr as GeoTiffManager
    participant BandMeta as BandMetadata
    participant ExprParser as ExpressionParser
    participant ColorMap as ColorMap
    participant Sharp as Sharp (Image)

    Client->>API: GET /index/20/381004/585533?indexName=NDVI
    API->>Controller: SpectralIndexController.getSpectralIndexTile()
    
    Controller->>Controller: Valida parâmetros (z, x, y)
    Controller->>TileService: generateSpectralIndexTile(tiffId, params, options)
    
    TileService->>GeoTiffMgr: loadGeoTiff(tiffId)
    alt Arquivo não está em cache
        GeoTiffMgr->>GeoTiffMgr: Lê arquivo .tif do disco
        GeoTiffMgr->>GeoTiffMgr: Carrega no cache
    end
    GeoTiffMgr-->>TileService: { instance, image, info }
    
    TileService->>BandMeta: extractBandMetadata(image)
    BandMeta->>BandMeta: Lê metadados GDAL
    BandMeta->>BandMeta: Detecta nomes das bandas
    BandMeta->>BandMeta: Cria aliases (nir, red, green, etc.)
    BandMeta-->>TileService: { bands, bandNames, bandByName }
    
    TileService->>TileService: Calcula BBox WGS84 do tile (z, x, y)
    TileService->>TileService: Reprojetá BBox para CRS da imagem
    TileService->>TileService: Converte BBox para window de pixels
    
    TileService->>GeoTiffMgr: image.readRasters({ window, samples })
    GeoTiffMgr-->>TileService: bandData[] (Float32Array por banda)
    
    TileService->>ExprParser: calculateSpectralIndex(equation, bandData, metadata)
    ExprParser->>ExprParser: tokenize(equation)
    ExprParser->>ExprParser: extractVariables(tokens)
    ExprParser->>ExprParser: mapeia variáveis → índices de banda
    
    loop Para cada pixel
        ExprParser->>ExprParser: evaluateExpression(equation, pixelValues)
        ExprParser->>ExprParser: Calcula resultado (ex: (nir-red)/(nir+red))
    end
    
    ExprParser-->>TileService: { data, width, height, min, max, mean }
    
    TileService->>ColorMap: applyColorMap(data, min, max, 'RdYlGn')
    
    loop Para cada pixel
        ColorMap->>ColorMap: normaliza valor (0-1)
        ColorMap->>ColorMap: interpola cor na paleta
    end
    
    ColorMap-->>TileService: Buffer RGB (3 bytes por pixel)
    
    TileService->>Sharp: encodeImage(buffer, width, height, 256)
    Sharp->>Sharp: Redimensiona para 256x256
    Sharp->>Sharp: Codifica para PNG
    Sharp-->>TileService: Buffer PNG
    
    TileService-->>Controller: Buffer PNG
    Controller-->>API: Response PNG
    API-->>Client: image/png
```

---

## 🧩 Componentes Principais

### 1️⃣ **GeoTiffManager** (Singleton)
```typescript
// Responsável por: cache de arquivos, carregamento, limpeza automática
```

**Funcionalidades:**
- Cache em memória de arquivos GeoTIFF
- Carregamento lazy (só carrega quando necessário)
- Limpeza automática baseada em tempo (CACHE_AGE_MINUTES)
- Resolução de caminhos (absolutos ou relativos ao DATA_DIR)

```mermaid
graph TD
    A[Requisição de Tile] --> B{Arquivo em cache?}
    B -->|Sim| C[Retorna do cache]
    B -->|Não| D[Lê do disco]
    D --> E[Parseia GeoTIFF]
    E --> F[Armazena no cache]
    F --> C
    C --> G[Retorna para TileService]
    
    H[Timer 10min] --> I{Cleanup necessário?}
    I -->|Sim| J[Remove arquivos antigos]
    I -->|Não| H
```

---

### 2️⃣ **BandMetadata**
```typescript
// Responsável por: extrair e interpretar metadados das bandas
```

**Estratégias de detecção:**

```mermaid
flowchart TD
    A[Inicia extração] --> B{Metadados GDAL?}
    B -->|Sim| C[Parseia XML GDAL_METADATA]
    C --> D{Nomes encontrados?}
    D -->|Sim| E[Usa nomes do GDAL]
    
    B -->|Não| F{Quantas bandas?}
    D -->|Não| F
    
    F -->|3| G[Assume RGB]
    F -->|4| H[Assume RGB + NIR]
    F -->|5| I[Assume Blue, Green, Red, NIR, SWIR1]
    F -->|8| J[Assume Sentinel-2]
    F -->|Outro| K[Usa Band1, Band2, ...]
    
    E --> L[Cria aliases]
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> M[Retorna metadata]
    
    style E fill:#90EE90
    style L fill:#FFD700
```

**Exemplo de aliases:**
```typescript
// Banda "NIR" pode ser acessada como:
- "nir"
- "near_infrared"
- "b4" (se for a 4ª banda)
- "band4"
```

---

### 3️⃣ **ExpressionParser**
```typescript
// Responsável por: interpretar e executar equações matemáticas
```

**Algoritmo (Shunting Yard + RPN):**

```mermaid
flowchart LR
    A[Equação String] --> B[Tokenização]
    B --> C[Infix Tokens]
    C --> D[Shunting Yard Algorithm]
    D --> E[RPN Tokens]
    E --> F[Avaliação RPN]
    F --> G[Resultado]
    
    style A fill:#E0E0E0
    style G fill:#90EE90
```

**Exemplo passo-a-passo:**

```
Entrada: "(nir - red) / (nir + red)"

1️⃣ TOKENIZAÇÃO:
['(', 'nir', '-', 'red', ')', '/', '(', 'nir', '+', 'red', ')']

2️⃣ CONVERSÃO PARA RPN (Notação Polonesa Reversa):
['nir', 'red', '-', 'nir', 'red', '+', '/']

3️⃣ AVALIAÇÃO (para NIR=0.8, RED=0.2):
Stack: []
- Push 0.8           → [0.8]
- Push 0.2           → [0.8, 0.2]
- Op '-'             → [0.6]
- Push 0.8           → [0.6, 0.8]
- Push 0.2           → [0.6, 0.8, 0.2]
- Op '+'             → [0.6, 1.0]
- Op '/'             → [0.6]

Resultado: 0.6 (NDVI)
```

**Operações suportadas:**
- Operadores: `+`, `-`, `*`, `/`, `^`
- Funções: `sqrt`, `abs`, `log`, `log10`, `exp`, `sin`, `cos`, `tan`, `min`, `max`

---

### 4️⃣ **TileService**
```typescript
// Responsável por: orquestração do processamento de tiles
```

**Pipeline de processamento:**

```mermaid
graph TB
    A[Recebe requisição z/x/y] --> B[Auto-correção de zoom]
    B --> C[Calcula BBox WGS84 do tile]
    C --> D[Reprojeção para CRS da imagem]
    D --> E{Tile intersecta imagem?}
    
    E -->|Não| F[Retorna tile transparente]
    E -->|Sim| G[Calcula window de pixels]
    
    G --> H[Lê rasters da imagem]
    H --> I{Tipo de tile?}
    
    I -->|RGB| J[Extrai bandas 0,1,2]
    I -->|VARI| K[Calcula VARI com formula]
    I -->|Spectral Index| L[Calcula índice espectral]
    
    J --> M[Aplica color map]
    K --> M
    L --> M
    
    M --> N[Redimensiona para tile size]
    N --> O[Codifica PNG/JPEG/WebP]
    O --> P[Retorna buffer]
    
    style F fill:#FFB6C1
    style P fill:#90EE90
```

---

### 5️⃣ **ColorMap**
```typescript
// Responsável por: aplicar paletas de cores aos valores calculados
```

**Paletas disponíveis:**

```mermaid
graph LR
    A[Valor calculado<br/>ex: NDVI = 0.6] --> B[Normalização 0-1]
    B --> C{Qual colormap?}
    
    C -->|viridis| D[Roxo → Verde → Amarelo]
    C -->|RdYlGn| E[Vermelho → Amarelo → Verde]
    C -->|ndvi| F[Marrom → Amarelo → Verde escuro]
    C -->|Spectral| G[Vermelho → Arco-íris → Azul]
    
    D --> H[Interpolação linear]
    E --> H
    F --> H
    G --> H
    
    H --> I[RGB final<br/>ex: 102, 194, 165]
    
    style A fill:#E0E0E0
    style I fill:#90EE90
```

**Exemplo de interpolação:**

```
ColorMap RdYlGn = [
  [165, 0, 38],      // Vermelho (0.0)
  [254, 224, 139],   // Amarelo (0.5)
  [0, 104, 55]       // Verde (1.0)
]

Valor: 0.6 (normalizado)
↓
Interpola entre Amarelo (0.5) e Verde (1.0)
Factor = (0.6 - 0.5) / (1.0 - 0.5) = 0.2
↓
R = 254 + (0 - 254) * 0.2 = 203
G = 224 + (104 - 224) * 0.2 = 200
B = 139 + (55 - 139) * 0.2 = 122
↓
RGB(203, 200, 122)
```

---

## 📊 Diagramas Arquiteturais

### Arquitetura em Camadas

```mermaid
graph TB
    subgraph "Cliente"
        A[Leaflet/OpenLayers]
    end
    
    subgraph "API Layer"
        B[Express Router]
        C[TileController]
        D[SpectralIndexController]
        E[GeoTiffController]
    end
    
    subgraph "Service Layer"
        F[TileService]
        G[GeoTiffManager]
    end
    
    subgraph "Utility Layer"
        H[BandMetadata]
        I[ExpressionParser]
        J[ColorMap]
        K[TileUtils]
    end
    
    subgraph "External Libraries"
        L[geotiff.js]
        M[Sharp]
        N[proj4]
        O[global-mercator]
    end
    
    subgraph "Storage"
        P[(Arquivo .tif)]
        Q[(Cache em Memória)]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    
    C --> F
    D --> F
    E --> G
    
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    
    G --> L
    F --> M
    K --> N
    K --> O
    
    G --> P
    G --> Q
    
    style A fill:#E3F2FD
    style B fill:#FFF3E0
    style F fill:#E8F5E9
    style G fill:#E8F5E9
    style P fill:#F3E5F5
    style Q fill:#FCE4EC
```

---

### Fluxo de Dados - Tile de Índice Espectral

```mermaid
flowchart TD
    A[Cliente solicita tile NDVI] --> B[Express recebe GET /index/:z/:x/:y]
    
    B --> C{Parâmetros válidos?}
    C -->|Não| D[Retorna 400 Bad Request]
    C -->|Sim| E[SpectralIndexController]
    
    E --> F[Determina equação<br/>indexName=NDVI: nir minus red over nir plus red]
    
    F --> G[TileService.generateSpectralIndexTile]
    
    G --> H[GeoTiffManager<br/>Carrega arquivo]
    
    H --> I{Em cache?}
    I -->|Sim| J[Usa cache]
    I -->|Não| K[Lê disco + Cache]
    
    J --> L[BandMetadata<br/>Extrai info das bandas]
    K --> L
    
    L --> M[TileUtils<br/>Calcula BBox e Window]
    
    M --> N[Lê pixels da região<br/>image.readRasters]
    
    N --> O[ExpressionParser<br/>Para cada pixel: calcula NDVI]
    
    O --> P[ColorMap<br/>Aplica paleta RdYlGn]
    
    P --> Q[Sharp<br/>Redimensiona + Encode PNG]
    
    Q --> R[Retorna Buffer PNG]
    R --> S[Cliente exibe no mapa]
    
    style A fill:#E3F2FD
    style D fill:#FFCDD2
    style R fill:#C8E6C9
    style S fill:#E3F2FD
```

---

### Processamento Pixel-por-Pixel

```mermaid
flowchart LR
    subgraph "Input: Bandas da Imagem"
        A1[Banda Red<br/>512x512 pixels]
        A2[Banda Green<br/>512x512 pixels]
        A3[Banda Blue<br/>512x512 pixels]
        A4[Banda NIR<br/>512x512 pixels]
    end
    
    subgraph "Processamento"
        B[Loop: 262,144 pixels]
        C[Pixel 0: R=120, G=150, B=80, NIR=200]
    D[Aplica equação: NDVI = nir minus red over nir plus red]
        E[Resultado: 0.25]
    end
    
    subgraph "Output"
        F[Array resultado<br/>512x512 Float32]
        G[ColorMap → RGB Buffer]
        H[PNG Tile 256x256]
    end
    
    A1 --> B
    A2 --> B
    A3 --> B
    A4 --> B
    
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    
    style H fill:#90EE90
```

---

## 🔧 Configurações e Otimizações

### Cache Strategy

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: loadGeoTiff()
    Loading --> Loaded: Arquivo carregado
    Loaded --> InUse: Requisição de tile
    InUse --> Loaded: Tile gerado
    Loaded --> Stale: Timer > CACHE_AGE_MINUTES
    Stale --> Removed: Cleanup task
    Removed --> [*]
    
    note right of Loaded
        Arquivo permanece em memória
        para requisições subsequentes
    end note
    
    note right of Stale
        Marcado para remoção
        após CACHE_AGE_MINUTES
    end note
```

---

### Reprojeção de Coordenadas

```mermaid
graph LR
    A[Tile XYZ<br/>z=20, x=381004, y=585533] --> B[Mercator Global<br/>Converte para BBox WGS84]
    
    B --> C[BBox WGS84<br/>lon: -47.123, -47.120<br/>lat: -22.456, -22.453]
    
    C --> D{CRS da imagem?}
    
    D -->|EPSG:4326| E[Mesma projeção<br/>Usa BBox direto]
    D -->|EPSG:32723<br/>UTM Zone 23S| F[Proj4<br/>Reprojeção necessária]
    
    F --> G[BBox no CRS da imagem<br/>x: 234567, 234890<br/>y: 7512345, 7512678]
    
    E --> H[Pixel Window<br/>minX: 1234, maxX: 1490<br/>minY: 5678, maxY: 5934]
    G --> H
    
    H --> I[Leitura de Rasters<br/>window: 1234, 5678, 1490, 5934]
    
    style A fill:#E3F2FD
    style I fill:#C8E6C9
```

---

## 📈 Performance

### Métricas Típicas

| Operação | Tempo Médio | Cache Hit | Cache Miss |
|----------|-------------|-----------|------------|
| Tile RGB 256x256 | ~50ms | ~30ms | ~200ms |
| Tile NDVI 256x256 | ~80ms | ~60ms | ~250ms |
| Parse de equação | ~1ms | - | - |
| ColorMap application | ~5ms | - | - |
| Sharp PNG encode | ~15ms | - | - |

### Otimizações Implementadas

1. **Cache em memória** - Evita releitura de disco
2. **Singleton pattern** - GeoTiffManager único
3. **Lazy loading** - Só carrega quando necessário
4. **Cleanup automático** - Remove arquivos antigos
5. **Float32Array** - Operações matemáticas rápidas
6. **Sharp** - Biblioteca C++ nativa para imagens

---

## 🎓 Conceitos Chave

### Sistema de Tiles XYZ

```
Zoom 0: 1 tile (mundo inteiro)
Zoom 1: 4 tiles (2x2)
Zoom 2: 16 tiles (4x4)
...
Zoom 20: 1,099,511,627,776 tiles (2^20 x 2^20)

Cada tile: 256x256 pixels (padrão)
```

### Índices Espectrais

**NDVI (Normalized Difference Vegetation Index)**
```
NDVI = (NIR - Red) / (NIR + Red)
Valores: -1 a 1
- Valores altos (0.6-1.0): Vegetação saudável
- Valores médios (0.2-0.6): Vegetação moderada
- Valores baixos (<0.2): Solo, água, áreas urbanas
```

**NDWI (Normalized Difference Water Index)**
```
NDWI = (Green - NIR) / (Green + NIR)
Útil para detectar corpos d'água
```

### Bandas Espectrais

| Banda | Comprimento de Onda | Aplicação |
|-------|---------------------|-----------|
| Blue | 450-495 nm | Penetração na água |
| Green | 495-570 nm | Pico de reflectância vegetal |
| Red | 620-750 nm | Absorção de clorofila |
| NIR | 750-900 nm | Estrutura celular das plantas |
| SWIR1 | 1550-1750 nm | Umidade do solo/vegetação |
| SWIR2 | 2080-2350 nm | Minerais, rochas |

---

## 🔗 Integrações

### Leaflet.js

```javascript
const tileLayer = L.tileLayer(
  'http://localhost:3001/index/{z}/{x}/{y}?indexName=NDVI&colormap=RdYlGn',
  {
    attribution: 'GeoTIFF Tile Server',
    maxZoom: 22
  }
);
```

### OpenLayers

```javascript
const tileLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: 'http://localhost:3001/index/{z}/{x}/{y}?indexName=NDVI&colormap=RdYlGn'
  })
});
```

---

## 📚 Referências

- [GeoTIFF.js Documentation](https://geotiffjs.github.io/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Proj4 Projections](https://proj.org/)
- [Slippy Map Tile Names (OSM)](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)
- [Spectral Indices Handbook](https://www.indexdatabase.de/)

