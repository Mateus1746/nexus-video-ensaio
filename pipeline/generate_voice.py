import os
import sys
import soundfile as sf
import numpy as np
from kokoro import KPipeline

def generate_narration(script_path, output_path, voice='am_adam'):
    print(f"--- Kokoro TTS: Iniciando Narração Industrial ---")
    print(f"Script: {script_path}")
    print(f"Voz: {voice}")
    
    if not os.path.exists(script_path):
        print(f"Erro: Script não encontrado em {script_path}")
        return

    with open(script_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Inicializa pipeline (a = American English)
    # Kokoro baixa o modelo automaticamente (~80MB)
    pipeline = KPipeline(lang_code='p')
    
    # Gera gerador de trechos (Kokoro lida bem com textos longos segmentando-os)
    generator = pipeline(text, voice=voice, speed=1.0)
    
    all_audio = []
    
    for i, (graphemes, phonemes, audio) in enumerate(generator):
        print(f"Processando trecho {i+1}...")
        all_audio.append(audio)
    
    if not all_audio:
        print("Erro: Nenhum áudio gerado.")
        return

    # Concatena todos os trechos
    final_audio = np.concatenate(all_audio)
    
    # Salva o resultado (Kokoro opera em 24kHz)
    sf.write(output_path, final_audio, 24000)
    print(f"--- Sucesso: Narração salva em {output_path} ---")
    print(f"Duração estimada: {len(final_audio) / 24000:.2f} segundos")

if __name__ == '__main__':
    script = 'pipeline/script_cold_war.txt'
    output = '/home/mateus/.gemini/projetos/nexus_renderizador/exports/narration_cold_war.wav'
    generate_narration(script, output)
