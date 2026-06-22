import os
import time
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Importa a lógica de compilação que já escrevemos
from nexus_director_v2 import compile_narrative

MASTER_SCRIPT_PATH = "/home/mateus/.gemini/projetos/nexus_renderizador/pipeline/master_script.json"
AUDIO_READY_DIR = "/home/mateus/.gemini/projetos/nexus_renderizador/pipeline/sync_drive/audio_ready"
OUTPUT_JSON_PATH = "/home/mateus/.gemini/projetos/nexus_renderizador/pipeline/narrative.json"

def get_expected_scenes():
    with open(MASTER_SCRIPT_PATH, 'r', encoding='utf-8') as f:
        master_data = json.load(f)
    return [scene["id"] for scene in master_data]

def are_all_files_ready(scenes):
    for scene_id in scenes:
        wav_path = os.path.join(AUDIO_READY_DIR, f"{scene_id}.wav")
        json_path = os.path.join(AUDIO_READY_DIR, f"{scene_id}_words.json")
        if not (os.path.exists(wav_path) and os.path.exists(json_path)):
            return False
    return True

class AudioReadyHandler(FileSystemEventHandler):
    def __init__(self, expected_scenes):
        self.expected_scenes = expected_scenes
        self.compiling = False

    def on_created(self, event):
        self.check_and_compile()

    def on_modified(self, event):
        self.check_and_compile()
        
    def check_and_compile(self):
        if self.compiling:
            return
            
        if are_all_files_ready(self.expected_scenes):
            self.compiling = True
            print("\n[🎯 ALVO DETECTADO] Todos os áudios e timestamps do Colab chegaram!")
            print("Iniciando compilação do Word-Level Sync...")
            
            # Pequeno delay para garantir que os arquivos terminaram de ser escritos pelo sync
            time.sleep(1.5)
            
            try:
                compile_narrative(MASTER_SCRIPT_PATH, OUTPUT_JSON_PATH, AUDIO_READY_DIR)
                print("\n[🎬 PIPELINE PRONTO]")
                print(f"Basta rodar: cargo run --release --bin render_native -- --narrative {OUTPUT_JSON_PATH} --output exports/final.mp4")
            except Exception as e:
                print(f"[ERRO] Falha ao compilar: {e}")
            finally:
                # Reseta para permitir novas execuções
                self.compiling = False

def start_watching():
    os.makedirs(AUDIO_READY_DIR, exist_ok=True)
    expected_scenes = get_expected_scenes()
    
    print("=== Nexus Watcher (Zero-Touch Sync) ===")
    print(f"Monitorando: {AUDIO_READY_DIR}")
    print(f"Aguardando arquivos para as cenas: {', '.join(expected_scenes)}")
    print("Vá para o Colab e execute o notebook. A compilação será automática quando os arquivos baixarem.\n")

    event_handler = AudioReadyHandler(expected_scenes)
    observer = Observer()
    observer.schedule(event_handler, AUDIO_READY_DIR, recursive=False)
    observer.start()
    
    # Verifica imediatamente caso os arquivos já estejam lá
    event_handler.check_and_compile()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\nWatcher encerrado.")
    observer.join()

if __name__ == "__main__":
    start_watching()
