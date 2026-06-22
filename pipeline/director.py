import json
import os
from pathlib import Path

# ============================================================
# NEXUS DIRECTOR - INDUSTRIAL SOVEREIGN VERSION
# ============================================================

# Autodetecção de caminhos e ambiente
SCRIPT_DIR = Path(__file__).parent.absolute()
FACTORY_ROOT = SCRIPT_DIR.parent

# Detecta se estamos rodando no Google Colab
IS_COLAB = os.path.exists("/content")

if IS_COLAB:
    # No Colab, o barramento central é o Drive montado
    DRIVE_ROOT = Path("/content/drive/MyDrive/nexus_pipeline")
    AUDIO_READY_DIR = DRIVE_ROOT / "audio_ready"
else:
    # Localmente, usamos a pasta espelhada
    SYNC_DIR = FACTORY_ROOT / "pipeline" / "sync_drive"
    AUDIO_READY_DIR = SYNC_DIR / "audio_ready"

ASSETS_DIR = FACTORY_ROOT / "assets"

# Configurações Globais de Produção
DEFAULT_PARTICLE_DENSITY = 15000
DEFAULT_SPEED = 0.5
DEFAULT_TURBULENCE = 0.2

def find_word_timestamp(whisper_data, target_word, start_after=0.0):
    """Localiza o timestamp de uma palavra no JSON do WhisperX com heurística robusta e fuzzy."""
    target_clean = target_word.lower().strip()
    for item in whisper_data:
        if item.get("start", 0) < start_after:
            continue
        
        # Normalização profunda: remove pontuação e caracteres especiais
        word_raw = item.get("word", "").lower()
        word_clean = "".join(c for c in word_raw if c.isalnum())
        target_norm = "".join(c for c in target_clean if c.isalnum())
        
        if target_norm and word_clean and (target_norm in word_clean or word_clean in target_norm):
            return item.get("start")
    
    return None

def build_visual_state(vtype, asset_name, is_initial=False):
    """Encapsula a lógica de construção do estado visual de partículas."""
    state = {
        "particles": {
            "density": DEFAULT_PARTICLE_DENSITY,
            "speed": 0.2 if is_initial else 0.8,
            "turbulence": 0.05 if is_initial else 0.3,
            "morph_strength": 1.0
        }
    }
    
    if vtype == "vector_map":
        # Usa caminho relativo para o mapa
        map_path = Path("test_assets") / asset_name
        state["particles"]["target_map"] = str(map_path)
    elif vtype == "icon":
        # Usa caminho relativo para os ícones
        icon_path = Path("assets") / asset_name
        state["particles"]["target_icon"] = str(icon_path)
    elif vtype == "text":
        state["particles"]["target_text"] = asset_name
        
    return state

def process_narrative_logic(events, whisper_data, audio_path_str, duration, lookback_grace=20.0):
    """
    Orquestrador da linha do tempo baseado em eventos.
    Aplica uma janela de lookback_grace para evitar que clusters de palavras 
    na mesma frase ou pequenas inversões matem os gatilhos visuais.
    """
    subshots = []
    sub_shot_timings = []
    
    # Inicialização: Mapa mundi estável
    subshots.append(build_visual_state("vector_map", "world.json", is_initial=True))

    last_t = 0.0
    for event in events:
        word = event["trigger_word"]
        
        # O pulo do gato: permitimos buscar um pouco antes de last_t para capturar a mesma frase
        search_start = max(0.0, last_t - lookback_grace)
        t = find_word_timestamp(whisper_data, word, start_after=search_start)
        
        if t is not None:
            t = round(t, 2)
            
            # Garantir consistência: se o novo t for menor que o last_t real por causa do lookback,
            # nós o forçamos a andar junto com o fluxo para manter a linha do tempo estritamente crescente.
            if t < last_t:
                t = last_t

            # Se o intervalo desde o último asset for > 15s, garante retorno ao mapa
            if len(sub_shot_timings) > 0:
                prev_t = sub_shot_timings[-1]
                if t - prev_t > 15.0:
                    return_t = round(prev_t + 15.0, 2)
                    if return_t < t:
                        sub_shot_timings.append(return_t)
                        subshots.append(build_visual_state("vector_map", "world.json"))

            sub_shot_timings.append(t)
            subshots.append(build_visual_state(event["vtype"], event["asset"]))
            
            # Avança o ponteiro real baseado no maior tempo linear consolidado
            last_t = max(last_t, t)
        else:
            print(f"⚠️ Gatilho ignorado: '{word}' não encontrada após {last_t}s.")

    return [{
        "id": "cold_war_full",
        "audio_file": audio_path_str,
        "duration": duration,
        "sub_shot_timings": sub_shot_timings,
        "visuals": subshots,
        "background": False,
        "grit": False
    }]

def generate_full_narrative():
    # Caminho base para a estrutura do documentary
    sub_dir = AUDIO_READY_DIR / "ensaio" / "full_documentary" / "script"
    
    # Heurística: pega o primeiro JSON da pasta (geralmente gerado pelo WhisperX)
    whisper_files = list(sub_dir.glob("*.json"))
    if not whisper_files:
        print(f"❌ Abortando: Dados do WhisperX não encontrados em {sub_dir}")
        return
    
    whisper_path = whisper_files[0]
    audio_path = sub_dir / "script.wav"
    
    print(f"🧐 Usando dados do WhisperX: {whisper_path.name}")

    if not whisper_path.exists():
        print(f"❌ Erro crítico: Arquivo {whisper_path} sumiu.")
        return

    with open(whisper_path, 'r', encoding='utf-8') as f:
        whisper_data = json.load(f)

    duration = whisper_data[-1].get("end", 0.0)
    events_map_path = SCRIPT_DIR / "events_map.json"
    
    with open(events_map_path, 'r', encoding='utf-8') as f:
        events = json.load(f)

    narrative = process_narrative_logic(events, whisper_data, str(audio_path.absolute()), duration)

    output_path = SCRIPT_DIR / "narrative.json"
    with open(output_path, 'w') as f:
        json.dump(narrative, f, indent=2)

    print(f"🚀 Narrativa Industrial gerada: {output_path}")

if __name__ == "__main__":
    generate_full_narrative()
