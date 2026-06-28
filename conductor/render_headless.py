import os
import subprocess
import wave
import contextlib
import sys

def render_story(factory, scene_id, **kwargs):
    print(f"🎬 Iniciando Renderização Headless para {factory} / {scene_id}...")
    
    # 1. Definir caminhos
    wav_path = f"pipeline/sync_drive/audio_ready/{factory}/{scene_id}/{scene_id}.wav"
    output_path = f"pipeline/sync_drive/exports/{factory}_{scene_id}.mp4"

    if not os.path.exists(wav_path):
        print(f"❌ Erro: Áudio não encontrado em {wav_path}")
        return False

    # 2. Obter duração do áudio
    with contextlib.closing(wave.open(wav_path, 'r')) as f:
        frames = f.getnframes()
        rate = f.getframerate()
        duration = frames / float(rate)
    
    # Adicionar pequena folga de segurança
    duration_rounded = round(duration + 0.2, 2)
    print(f"⏱️ Duração do áudio detectada: {duration_rounded}s")

    # 3. Build dos assets web (se necessário)
    if os.path.exists("web/build.js"):
        print("📦 Buildando assets estáticos...")
        subprocess.run(["node", "web/build.js"], check=True)
    else:
        print("📦 Pulando build (sem script de build)...")

    # 4. Executar o Engine-Headless-Recorder
    print("🎥 Executando Engine-Headless-Recorder...")
    recorder_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        "../tools/Engine-Headless-Recorder/src/node/record_video.js"
    ))

    cmd = [
        "node", recorder_path,
        "--canvas=#video-canvas",
        f"--duration={duration_rounded}",
        "--fps=25",
        f"--output={output_path}"
    ]

    print(f"🚀 Rodando comando: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    print(f"🎉 Sucesso! Vídeo gravado e salvo em: {output_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python render_headless.py <factory> <scene_id>")
        sys.exit(1)
    
    factory = sys.argv[1]
    scene_id = sys.argv[2]
    render_story(factory, scene_id)
