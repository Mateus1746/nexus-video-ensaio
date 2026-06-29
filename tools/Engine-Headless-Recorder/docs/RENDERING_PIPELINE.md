# Headless Rendering Pipeline Optimization

## 1. ASCII Diagram
Node.js CLI -> Puppeteer -> Chrome Headless -> Canvas 2D -> WebCodecs VideoEncoder -> OPFS -> exposeFunction chunks -> fs.createWriteStream -> MP4 em disco

## 2. CLI Parameters
| Param | Default | Limites | Descricao |
|---|---|---|---|
| --duration | 10 | 1-3600 | Duracao em segundos |
| --fps | 25 | 1-60 | Frames por segundo |
| --mode | gpu | gpu/cpu | Modo de renderizacao |
| --output | output.mp4 | qualquer path | Arquivo de saida |
| --canvas | #video-canvas | qualquer selector CSS | ID do canvas a capturar |
| --width | 1280 | 320-1920 | Largura de captura |
| --height | 720 | 240-1080 | Altura de captura |

## 3. Metrics per Mode
| Modo | FPS Esperado | Uso de CPU | Uso de GPU | Limite pratico |
|---|---|---|---|---|
| GPU NVIDIA | 80-220 FPS | medio | alto | limitado por VRAM e encoder |
| CPU SwiftShader | 10-20 FPS | maximo | zero | limitado por clock da CPU |
| CPU Paralelo (5 workers) | 15-25 FPS totais | maximo | zero | limitado por IPC overhead |

## 4. Top 5 Problems and Solutions
1. **RangeError Invalid string length:** usar chunked download
2. **Velocidade caindo ao longo do tempo:** adicionar encodeQueueSize backpressure
3. **SwiftShader em vez de GPU:** verificar PRIME offload env vars
4. **Browser trava sem mensagem:** aumentar protocolTimeout: 0 no puppeteer.launch
5. **Canvas nao encontrado:** verificar se app carregou via window.__appReady

## 5. Minimum Requirements
- Node.js >= 20
- Chromium >= 120 (incluso pelo Puppeteer)
- Driver NVIDIA >= 525 para PRIME offload
- Linux com libGL e libnvidia-gl instalados para GPU discreta
