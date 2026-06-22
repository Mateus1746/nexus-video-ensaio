# TRACE: Portabilidade e Correções — ensaio

## Registro de Decisões Causal

### [DECISION]
Portabilidade da pipeline de simulação física baseada em WGPU Rust + compute shader para uma aplicação leve de CPU baseada em HTML5/Canvas 2D com amostragem de vetores (GeoJSON) e rasterizados (ícones de assets), e integração com a timeline através do arquivo `narrative.json`.

### [RATIONALE]
* A renderização em Rust/WGPU exigia compilação local complexa e drivers de GPU que falhavam frequentemente no Google Colab ou em máquinas locais sem suporte headless adequado.
* A simulação de morphing semântico foi portada amostrando dinamicamente pixels úteis a partir de imagens carregadas e polígonos do GeoJSON (`world.json`), definindo um mapeamento determinístico de atração magnética de partículas.
* A timeline sequencial se comunica com a Web através do seek determinístico de `window.__hf` que reconstrói os passos do tempo físico a partir de $t=0$ a 30 FPS, permitindo a gravação precisa no Puppeteer.

### [CONSEQUENCE]
* O projeto agora é 100% Web na subpasta `./web`.
* O pipeline é independente do ecossistema Rust para renderizar o vídeo final, eliminando a dependência de GPUs nativas e simplificando a depuração.

### Decisão: Eliminação Completa do Google Colab e Automação Local Unificada (SOTA 2026)
`[DECISION] -> [RATIONALE] -> [CONSEQUENCE]`
* **DECISION**: Migrar o fluxo de áudio do Colab para síntese local via Kokoro (usando os DNAs de voz `.pt` no Drive) e utilizar o `Engine-Headless-Recorder` no lugar de compilação por CPU do FFmpeg.
* **RATIONALE**: A esteira anterior exigia sincronização manual e processamento externo lento. Com o Kokoro local e a gravação via Puppeteer Headless Canvas, alcançamos velocidades de renderização acima de **~85 FPS** de forma 100% automatizada e offline.
* **CONSEQUENCE**: Pipeline unificado e executado em um único comando: `uv run python conductor/run_pipeline.py`.
