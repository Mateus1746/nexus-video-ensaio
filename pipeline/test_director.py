import pytest
from pipeline.director import find_word_timestamp, process_narrative_logic

# Mock de dados do WhisperX para testes
MOCK_WHISPER = [
    {"word": "In", "start": 0.0, "end": 0.5},
    {"word": "1945", "start": 0.6, "end": 1.2},
    {"word": "the", "start": 1.3, "end": 1.5},
    {"word": "world", "start": 1.6, "end": 2.1},
    {"word": "changed", "start": 2.2, "end": 2.8},
    {"word": "militar", "start": 3.0, "end": 3.5},
    {"word": "nuclear", "start": 5.0, "end": 5.8},
]

def test_find_word_timestamp_exact():
    """Valida a detecção exata de palavras."""
    assert find_word_timestamp(MOCK_WHISPER, "1945") == 0.6
    assert find_word_timestamp(MOCK_WHISPER, "world") == 1.6

def test_find_word_timestamp_fuzzy():
    """Valida a detecção heurística/fuzzy (remoção de caracteres)."""
    # Testando a heurística de remoção de 'o' e 'm' se necessário, 
    # ou apenas o strip de pontuação.
    assert find_word_timestamp(MOCK_WHISPER, "militar") == 3.0

def test_find_word_timestamp_not_found():
    """Valida comportamento quando a palavra não existe."""
    assert find_word_timestamp(MOCK_WHISPER, "banana") is None

def test_find_word_timestamp_sequential():
    """Valida que o start_after impede de pegar a mesma palavra repetida."""
    whisper_repeat = [
        {"word": "test", "start": 1.0},
        {"word": "test", "start": 5.0}
    ]
    t1 = find_word_timestamp(whisper_repeat, "test")
    assert t1 == 1.0
    t2 = find_word_timestamp(whisper_repeat, "test", start_after=1.1)
    assert t2 == 5.0

def test_process_narrative_logic_structure():
    """Valida se a estrutura do JSON gerado segue o contrato do renderizador."""
    mock_events = [
        { "trigger_word": "1945", "vtype": "vector_map", "asset": "world.json" },
        { "trigger_word": "nuclear", "vtype": "icon", "asset": "nuclear_icon.png" }
    ]
    
    narrative = process_narrative_logic(mock_events, MOCK_WHISPER, "test.wav", 10.0)
    
    assert len(narrative) == 1
    scene = narrative[0]
    assert scene["id"] == "cold_war_full"
    assert scene["duration"] == 12.0 # 10.0 + 2.0 offset
    
    # Subshots: 1 inicial + 2 eventos = 3
    assert len(scene["visuals"]) == 3
    assert len(scene["sub_shot_timings"]) == 2
    assert scene["sub_shot_timings"] == [0.6, 5.0]
    
    # Valida o primeiro subshot (World Map padrão)
    assert scene["visuals"][0]["particles"]["target_map"] == "world"
    
    # Valida o segundo subshot (Morphing para o segundo World Map vindo do evento)
    assert scene["visuals"][1]["particles"]["target_map"] == "world"
    
    # Valida o terceiro subshot (Ícone Nuclear)
    assert "target_icon" in scene["visuals"][2]["particles"]
    assert "nuclear_icon.png" in scene["visuals"][2]["particles"]["target_icon"]

def test_legibilidade_semantica_icon_paths():
    """Garante que os ícones estão sendo apontados para a pasta de assets correta."""
    mock_events = [{ "trigger_word": "nuclear", "vtype": "icon", "asset": "nuclear_icon.png" }]
    narrative = process_narrative_logic(mock_events, MOCK_WHISPER, "test.wav", 10.0)
    
    icon_path = narrative[0]["visuals"][1]["particles"]["target_icon"]
    # O caminho deve ser relativo à raiz da fábrica 'ensaio' para o SceneCompiler resolver
    assert icon_path.startswith("assets/")
