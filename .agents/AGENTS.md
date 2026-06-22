# Guia de Execucao Autonoma

- **Canvas Selector**: `#video-canvas`
- **renderFrame API**: `window.renderFrame(tMs)` resolves when a frame at `tMs` (milliseconds) is rendered.
- **initializeScene**: Controlled by `window.onload` and sets `window.__appReady = true` when initialization completes.
- **__appReady Status**: `window.__appReady = true` signals that all assets are loaded and the app is ready for headless rendering.
- **npm run build output**: Build output for headless recorder (in `tools/Engine-Headless-Recorder/`) includes WASM and JS bundles. Ensure you run `npm install` and build before use.
- **Recorder command**: Main local pipeline is executed using `uv run python conductor/run_pipeline.py`.
- **fetch() assets**:
    - `../pipeline/narrative.json`
    - `../test_assets/world.json`
    - Any icons specified in `narrative.json` visuals
    - Note: Copy any missing fetched assets to `public/` (or ensure they exist relative to the HTML file).
