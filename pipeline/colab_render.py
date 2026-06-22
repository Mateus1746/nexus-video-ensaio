import os
import subprocess
import sys

# ============================================================
# NEXUS CLOUD RENDERER - COLAB AUTOMATION SCRIPT
# ============================================================

RENDERER_DIR = "/content/nexus_renderizador"

def run_cmd(cmd, shell=True):
    print(f"[Running]: {cmd}")
    process = subprocess.Popen(cmd, shell=shell, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        print(line, end="")
    process.wait()
    if process.returncode != 0:
        print(f"❌ Command failed with code {process.returncode}")
        return False
    return True

def setup_colab_environment(drive_mount_path=None):
    print("🚀 Iniciando Setup Industrial do Nexus no Colab...")
    
    # 1. Dependências de Sistema (Vulkan, FFmpeg, build-essential)
    run_cmd("apt-get update -y && apt-get install -y libvulkan-dev build-essential ffmpeg libwayland-dev libx11-dev")

    # 2. Instalação do Rust (se não existir)
    if not run_cmd("rustc --version"):
        run_cmd("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y")
        os.environ["PATH"] += os.pathsep + os.path.expanduser("~/.cargo/bin")
    
    # 3. Estratégia Híbrida para o Renderizador
    if os.path.exists(RENDERER_DIR):
        print(f"✅ Renderizador já presente em {RENDERER_DIR}")
        return

    # Tenta copiar do Drive se o caminho for fornecido (Sovereign Sync)
    if drive_mount_path:
        drive_src = f"{drive_mount_path}/staging/ensaio/nexus_renderizador"
        if os.path.exists(drive_src):
            print(f"🛸 Copiando Renderizador do Drive: {drive_src}")
            run_cmd(f"cp -r {drive_src} {RENDERER_DIR}")
            return

    # Fallback para Git (apenas se for público ou configurado)
    print("⚠️ Renderizador não encontrado no Drive. Tentando Git...")
    run_cmd(f"git clone https://github.com/Mateus1746/nexus_renderizador.git {RENDERER_DIR}")

def run_director(drive_mount_path):
    """
    Executa o diretor diretamente no Colab para gerar a narrativa
    baseada nos arquivos de áudio/whisper que já estão no Drive.
    """
    factory_name = "ensaio"
    # O diretor precisa rodar dentro da pasta do pipeline para achar o events_map.json
    pipeline_path = f"{drive_mount_path}/staging/{factory_name}/pipeline"
    
    print("🧠 Rodando Nexus Director no Colab...")
    run_cmd(f"cd {pipeline_path} && python3 director.py")

def run_render(drive_mount_path):
    """
    Executa o renderizador usando os caminhos do Google Drive montado com garantias Headless.
    """
    # Injeção de variáveis de driver para ambiente sem servidor de exibição (Headless)
    os.environ["WGPU_BACKEND"] = "vulkan"
    os.environ["WGPU_POWER_PREFERENCE"] = "high"
    os.environ["DISPLAY"] = "" 
    
    factory_name = "ensaio"
    # Importante: project_root deve ser o local onde os assets/ estão
    project_root = f"{drive_mount_path}/staging/{factory_name}"
    narrative = f"{project_root}/pipeline/narrative.json"
    
    # Busca o áudio dinamicamente na pasta audio_ready
    audio_dir = f"{drive_mount_path}/audio_ready/{factory_name}/full_documentary/script"
    audio = f"{audio_dir}/script.wav"
    
    output = f"{drive_mount_path}/audio_ready/{factory_name}/cold_war_cloud_final.mp4"
    
    print(f"🎬 Iniciando Renderização Cloud para {factory_name}...")
    
    render_cmd = (
        f"cd {RENDERER_DIR} && cargo run --release --bin render_native -- "
        f"--narrative {narrative} "
        f"--output {output} "
        f"--audio {audio} "
        f"--project-root {project_root}"
    )
    
    run_cmd(render_cmd)

if __name__ == "__main__":
    # Exemplo de uso no Colab:
    # from google.colab import drive
    # drive.mount('/content/drive')
    # setup_colab_environment()
    # run_render('/content/drive/MyDrive/nexus_pipeline')
    pass
