# 🔊 Documentação de Integração de Áudio Automatizada (Pipeline Rclone)

Este documento descreve o fluxo de trabalho automatizado para geração de narração e sincronização de áudio utilizando o motor Nexus e o Google Drive via Rclone.

## 🏛️ Arquitetura da Esteira

O sistema opera através de uma estrutura de pastas sincronizada entre sua máquina local e o Google Drive.

### 1. Estrutura de Diretórios
A estrutura deve ser mantida rigorosamente da seguinte forma:

```text
nexus_pipeline/
├── staging/
│   └── <nome_da_fabrica>/
│       └── <id_da_cena>/
│           └── script.txt        # Seu roteiro aqui
└── audio_ready/
    └── <nome_da_fabrica>/
        └── <id_da_cena>/
            ├── audio.wav
            └── <timestamp>_words.json
```

## 🚀 Workflow de Operação

### Passo 1: Envio (Sua Máquina)
Coloque o arquivo de texto do seu roteiro na pasta local:
`pipeline/sync_drive/staging/<nome_da_fabrica>/<id_da_cena>/script.txt`

Em seguida, execute no terminal do projeto:
```bash
./pipeline/sync.sh up
```

### Passo 2: Processamento (Google Colab)
O notebook `Kokoro_WhisperX_Sync.ipynb` no Colab detectará novos arquivos em `staging/`, processará a narração (Kokoro) e a sincronia (WhisperX), e salvará os resultados automaticamente em `audio_ready/<nome_da_fabrica>/<id_da_cena>/`.

### Passo 3: Recebimento (Sua Máquina)
Após o processamento no Colab, execute no terminal do projeto para baixar os assets:
```bash
./pipeline/sync.sh down
```

Os arquivos estarão disponíveis em:
`pipeline/sync_drive/audio_ready/<nome_da_fabrica>/<id_da_cena>/`

---
*Nexus System v6.8 - Pipeline Automatizado*
