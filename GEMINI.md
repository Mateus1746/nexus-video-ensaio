# 🏗️ NEXUS ENSAIO: Sovereign Content Factory

## 🎥 Visão Geral
Este projeto é uma unidade de produção de vídeo automatizada que transforma roteiros em ensaios visuais baseados em partículas orgânicas. O sistema é projetado para operar em um workflow **Cloud-Native**, minimizando o processamento local e utilizando GPUs de alto desempenho via Google Colab.

## 🛠️ Stack Tecnológica (SOTA 2026)
### 1. Engine de Renderização (O "Coração")
- **Linguagem:** Rust (Performance Industrial).
- **Gráficos:** WGPU (WebGPU nativo) para simulação de partículas via Compute Shaders (WGSL).
- **Estética:** Partículas orgânicas com morphing semântico e vibratilidade browniana.
- **Encoder:** FFmpeg via VA-API (Hardware Acceleration) para exportação NV12.

### 2. Pipeline de Inteligência (O "Cérebro")
- **Áudio/Voz:** Kokoro TTS (SOTA Voice Synthesis).
- **Sincronia:** WhisperX para extração de timestamps palavra por palavra.
- **Direção:** Python (Director Script) para mapeamento semântico áudio -> visual.

### 3. Infraestrutura Cloud
- **Orquestração:** Google Colab (GPU T4/L4).
- **Armazenamento:** Google Drive (via Rclone) como barramento central de dados.
- **Ambiente Python:** UV (Fast package manager).

## 📂 Arquitetura de Arquivos e Localização

### 1. Localização Local (Fábrica)
- `pipeline/`:
    - `director.py`: Gerador da narrativa visual.
    - `colab_render.py`: Script de automação para o ambiente Google.
    - `sync.sh`: Script de sincronia local <-> nuvem.
- `assets/`: Biblioteca de 20+ ícones semânticos otimizados (PNG).
- `test_assets/`: Mapas vetoriais (GeoJSON).
- `pipeline/sync_drive/`: Pasta espelhada no Google Drive.

### 2. Estrutura na Nuvem (Google Drive)
`nexus_pipeline/`
├── `staging/ensaio/`           # Recebe assets e roteiros da máquina local.
│   ├── `assets/`
│   └── `pipeline/`             # Scripts para rodar no Colab.
└── `audio_ready/ensaio/`       # Onde o áudio é gerado e o vídeo final é salvo.
    ├── `full_documentary/`     # Saída do Qwen/Kokoro.
    └── `cold_war_cloud_final.mp4` # O PRODUTO FINAL.

## 🚀 Workflow Ponta a Ponta (Sem PC Local)
1. **Roteiro:** Editado localmente ou no Colab.
2. **Áudio (Notebook 1):** Qwen gera o texto -> Kokoro gera o áudio -> WhisperX gera timestamps -> Salva no Drive.
3. **Sincronia Local:** `./pipeline/sync.sh up` (apenas para atualizar scripts/assets se necessário).
4. **Render (Notebook 2):** `colab_render.py` é executado -> Lê áudio do Drive -> Gera narrativa -> Renderiza vídeo usando GPU Cloud -> Salva vídeo no Drive.

---
*Nexus System v6.8 - Sovereign Architecture - 13/06/2026*
