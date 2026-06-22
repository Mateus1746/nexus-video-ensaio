# 🎛️ Guia de Integração - Nexus Audio & Video Factory
Esse guia documenta de forma pragmática como as fábricas de vídeo do ecossistema Nexus realizam pedidos e recebem assets de áudio masterizados e sincronizados.

---

## 🏛️ Filosofia de Arquitetura: IPC Local & Disco Compartilhado
Rejeitamos a complexidade desnecessária de microsserviços, APIs REST locais ou filas de mensageria (RabbitMQ/Redis) se todos os processos rodam na mesma máquina física. A comunicação entre a fábrica de vídeo e o motor de áudio é feita via **Inter-Process Communication (IPC) local**:
1. A fábrica de vídeo executa a CLI de áudio (`nexus_audio_cli.py`) como um **subprocesso**.
2. O motor de áudio gera e transcodifica os assets, injetando-os diretamente no diretório da fábrica chamadora de forma **atômica** (usando `.tmp` e substituição no sistema de arquivos para evitar concorrência ou leitura de arquivos corrompidos).
3. A fábrica de vídeo lê o resultado estruturado em **JSON** direto no `stdout` do subprocesso para confirmar o sucesso antes de iniciar o render visual.

---

## 🚀 1. O Pedido da Fábrica (Linha de Comando)
Para solicitar uma trilha, o script da fábrica deve executar o seguinte comando a partir da pasta do motor de áudio:

```bash
NEXUS_VIDEO_ROOT="/home/mateus/.gemini/projetos/nexus_media/video" \
uv run python nexus_audio_cli.py \
  --generate <style> \
  --duration <minutes> \
  --render \
  --inject <factory_name> \
  --json
```

### Flags de Automação:
*   `--generate`: Escolha do estilo (`lofi`, `documentary`, `synthwave`, `corporate`, `omni`, `phonk`).
*   `--duration`: Duração alvo da faixa em minutos (Ex: `1.5`).
*   `--render`: Solicita a renderização obrigatória de MIDI para WAV via FluidSynth.
*   `--inject`: Nome do diretório da fábrica de vídeo alvo (Ex: `ensaio`).
*   `--json`: Retorna a saída estruturada em JSON e redireciona os prints normais de log para o `sys.stderr`, mantendo o `stdout` limpo para o parser da fábrica.

---

## 🧬 2. Fluxo de Entrega de Assets
Ao utilizar `--inject <factory_name>`, o motor de áudio grava os seguintes arquivos de forma atômica no subdiretório `/public` da fábrica correspondente:

```
video/<factory_name>/
├── public/
│   ├── audio.wav       # Sinal estéreo original de alta fidelidade
│   ├── audio.mp3       # Transcodificação MP3 de alta performance (para web/browser)
│   └── sync.json       # Pulse Map (onsets de Note On para animação reativa ao BPM)
└── .nexus_backups/     # Backups datados para evitar perda de dados históricos
```

---

## 💻 3. Exemplos de Implementação

### Integração em Python
Insira este método no script de orquestração da sua fábrica de vídeo:

```python
import subprocess
import json
import os

def request_audio(style: str, duration_minutes: float, factory_name: str) -> dict:
    """Invoca o motor de áudio e aguarda a injeção física de WAV, MP3 e Pulse Map."""
    cmd = [
        "uv", "run", "python", "nexus_audio_cli.py",
        "--generate", style,
        "--duration", str(duration_minutes),
        "--render",
        "--inject", factory_name,
        "--json"
    ]
    
    # Define o path raiz da biblioteca de vídeos na env
    env = os.environ.copy()
    env["NEXUS_VIDEO_ROOT"] = "/home/mateus/.gemini/projetos/nexus_media/video"
    
    # Executa o subprocesso apontando para o diretório do motor
    result = subprocess.run(
        cmd, 
        cwd="/home/mateus/.gemini/projetos/nexus_media/audio/audio-engine", 
        capture_output=True, 
        text=True, 
        env=env
    )
    
    if result.returncode != 0:
        raise RuntimeError(f"Falha na geração do áudio: {result.stderr}")
        
    return json.loads(result.stdout)

# Exemplo de uso:
# result_json = request_audio(style="lofi", duration_minutes=1.0, factory_name="ensaio")
# print("Áudio injetado com sucesso:", result_json["factory_outputs"])
```

### Integração em Node.js (Vite / Remotion)
Caso sua fábrica use automação em Javascript/Typescript:

```javascript
const { execSync } = require('child_process');

/**
 * Solicita trilha sonora ao motor de áudio.
 * @param {string} style - Estilo musical
 * @param {number} duration - Duração em minutos
 * @param {string} factoryName - Nome da pasta da fábrica
 */
function requestAudio(style, duration, factoryName) {
  const audioDir = '/home/mateus/.gemini/projetos/nexus_media/audio/audio-engine';
  const videoRoot = '/home/mateus/.gemini/projetos/nexus_media/video';
  
  const cmd = `uv run python nexus_audio_cli.py --generate ${style} --duration ${duration} --render --inject ${factoryName} --json`;
  
  try {
    const stdout = execSync(cmd, {
      cwd: audioDir,
      env: { ...process.env, NEXUS_VIDEO_ROOT: videoRoot },
      encoding: 'utf-8'
    });
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Falha no subprocesso do motor de áudio: ${error.stderr || error.message}`);
    throw error;
  }
}

// Exemplo de uso:
// const res = requestAudio("documentary", 1.5, "ensaio");
// console.log("Assets injetados:", res.factory_outputs);
```
