// ============================================================
// SOVEREIGN ENSAY - PARTICLE TRANSITION FRONTEND ENGINE (SOTA 2026)
// ============================================================

const numParticles = 6000;
const targetFps = 30;
const canvas = document.getElementById("video-canvas");
const ctx = canvas.getContext("2d");
const hudTime = document.getElementById("hud-time");
const hudTarget = document.getElementById("hud-target");
const isHeadless = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("headless") === "true";

let narrativeData = null;
let worldGeoJSON = null;
let duration = 571.79;
let timelines = [];
let visuals = [];

const textureCache = {};
const sampledShapes = {}; // Salva as coleções de pontos amostrados dos ícones/mapas
let particles = [];

// Gerador pseudo-aleatório determinístico
let simSeed = 42;
function deterministicRandom() {
    let x = Math.sin(simSeed++) * 10000;
    return x - Math.floor(x);
}

// Projeta coordenadas lat/lon para o canvas de 1920x1080
function project(lon, lat) {
    const scaleX = 1920 / 360;
    const scaleY = 1080 / 180;
    const x = (lon + 180) * scaleX;
    const y = (90 - lat) * scaleY; // Invert Y
    return { x, y };
}

// Extrai e projeta pontos do GeoJSON
function extractPointsFromGeoJSON(geojson) {
    const coords = [];
    geojson.features.forEach(f => {
        if (f.geometry.type === "Polygon") {
            f.geometry.coordinates.forEach(ring => {
                ring.forEach(c => coords.push(project(c[0], c[1])));
            });
        } else if (f.geometry.type === "MultiPolygon") {
            f.geometry.coordinates.forEach(poly => {
                poly.forEach(ring => {
                    ring.forEach(c => coords.push(project(c[0], c[1])));
                });
            });
        }
    });
    return coords;
}

// Amostra pixels de uma imagem carregada
function samplePointsFromImage(img, count) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 120;
    tempCanvas.height = 120;
    const tCtx = tempCanvas.getContext("2d");
    tCtx.drawImage(img, 0, 0, 120, 120);
    
    const imgData = tCtx.getImageData(0, 0, 120, 120).data;
    const validPixels = [];
    
    for (let y = 0; y < 120; y++) {
        for (let x = 0; x < 120; x++) {
            const alpha = imgData[(y * 120 + x) * 4 + 3];
            if (alpha > 80) { // Limite do canal Alpha
                // Centraliza o ícone e escala
                validPixels.push({
                    x: 1920 / 2 + (x - 60) * 6,
                    y: 1080 / 2 + (y - 60) * 6
                });
            }
        }
    }

    const points = [];
    simSeed = 99; // Seed para amostragem estática consistente
    for (let i = 0; i < count; i++) {
        if (validPixels.length > 0) {
            const p = validPixels[Math.floor(deterministicRandom() * validPixels.length)];
            points.push(p);
        } else {
            points.push({ x: 1920/2, y: 1080/2 });
        }
    }
    return points;
}

// Inicialização da simulação
function initSimulation() {
    simSeed = 42;
    particles = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < numParticles; i++) {
        const angle = deterministicRandom() * Math.PI * 2;
        const radius = 10 + deterministicRandom() * 400;
        const p = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            tx: centerX, // Target X
            ty: centerY, // Target Y
            z: 0.2 + deterministicRandom() * 2.5, // Maior variação de profundidade/tamanho
            noiseOffset: deterministicRandom() * 1000,
            history: [],
            life: deterministicRandom(), // Vida útil da partícula (0.0 a 1.0)
            colorOffset: deterministicRandom() // Para variar cores individualmente
        };
        // Histórico mais longo para caudas mais longas e dinâmicas
        for (let h = 0; h < 8; h++) {
            p.history.push({ x: p.x, y: p.y });
        }
        particles.push(p);
    }
}

// Carregar e processar todos os recursos na inicialização
async function loadResources() {
    // 1. Carregar Narrative
    const nResp = await fetch("../pipeline/narrative.json");
    narrativeData = await nResp.json();
    timelines = narrativeData[0].sub_shot_timings;
    visuals = narrativeData[0].visuals;
    duration = narrativeData[0].duration;

    // 2. Carregar GeoJSON
    const gResp = await fetch("../test_assets/world.json");
    worldGeoJSON = await gResp.json();
    const mapCoords = extractPointsFromGeoJSON(worldGeoJSON);

    // Amostrar pontos do mapa
    simSeed = 77;
    const mapPoints = [];
    for (let i = 0; i < numParticles; i++) {
        if (mapCoords.length > 0) {
            mapPoints.push(mapCoords[Math.floor(deterministicRandom() * mapCoords.length)]);
        } else {
            mapPoints.push({ x: 1920/2, y: 1080/2 });
        }
    }
    sampledShapes["test_assets/world.json"] = mapPoints;

    // 3. Pré-carregar ícones com dispersão extra
    const uniqueIcons = [...new Set(
        visuals
            .map(v => v.particles.target_icon)
            .filter(icon => !!icon)
    )];

    const iconPromises = uniqueIcons.map(iconPath => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = `../${iconPath}`;
            img.onload = () => {
                textureCache[iconPath] = img;
                // Amostra pontos a partir da imagem
                sampledShapes[iconPath] = samplePointsFromImage(img, numParticles);
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load icon: ${iconPath}`);
                sampledShapes[iconPath] = Array.from({ length: numParticles }, () => ({ x: 1920/2, y: 1080/2 }));
                resolve();
            };
        });
    });

    await Promise.all(iconPromises);
    console.log("🚀 All resources and shapes parsed successfully.");
}

// Variáveis de estado global para UI Dinâmica
let currentTargetText = "";
let lastTargetKey = "";

// Configura o target das partículas para o visual corrente
function applyVisualTarget(visual) {
    let targetKey = "test_assets/world.json";
    if (visual.particles.target_icon) {
        targetKey = visual.particles.target_icon;
    } else if (visual.particles.target_map) {
        targetKey = visual.particles.target_map;
    }

    // Atualiza texto alvo se existir
    if (visual.particles.target_text) {
        currentTargetText = visual.particles.target_text;
    } else {
        currentTargetText = ""; // Limpa se não houver
    }

    // Aplica dispersão extra (explosão) na transição de alvos
    if (lastTargetKey !== "" && lastTargetKey !== targetKey) {
        for (let i = 0; i < particles.length; i++) {
            // Empurrão radial na transição
            const angle = deterministicRandom() * Math.PI * 2;
            const force = 10 + deterministicRandom() * 30;
            particles[i].vx += Math.cos(angle) * force;
            particles[i].vy += Math.sin(angle) * force;
        }
    }
    lastTargetKey = targetKey;

    const points = sampledShapes[targetKey] || sampledShapes["test_assets/world.json"];
    for (let i = 0; i < particles.length; i++) {
        particles[i].tx = points[i].x;
        particles[i].ty = points[i].y;
    }
    if (!isHeadless && hudTarget) {
        hudTarget.innerText = targetKey.split("/").pop();
    }
}

// Tabela de Busca (LUT) de alto desempenho para funções trigonométricas sines/cosines
const LUT_SIZE = 8192;
const LUT_MASK = LUT_SIZE - 1;
const sinTable = new Float32Array(LUT_SIZE);
const cosTable = new Float32Array(LUT_SIZE);
const RAD_TO_INDEX = LUT_SIZE / (Math.PI * 2);

for (let i = 0; i < LUT_SIZE; i++) {
    const angle = (i / LUT_SIZE) * Math.PI * 2;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

function fastSin(rad) {
    let idx = (rad * RAD_TO_INDEX) | 0;
    return sinTable[idx & LUT_MASK];
}

function fastCos(rad) {
    let idx = (rad * RAD_TO_INDEX) | 0;
    return cosTable[idx & LUT_MASK];
}

const ALPHA_STRINGS = new Array(101);
for (let i = 0; i <= 100; i++) {
    ALPHA_STRINGS[i] = (i / 100).toFixed(2);
}
const colorCache = new Map();

// Simplex noise approximation for curl/flow using LUT trig functions
function curlNoise(x, y, time) {
    const scale = 0.005;
    const n1 = fastSin(x * scale + time) * fastCos(y * scale - time);
    const n2 = fastCos(x * scale - time) * fastSin(y * scale + time);
    return { cx: n1, cy: n2 };
}

// Atualização física das partículas com LUTs
function updatePhysics(dt, time, morphStrength = 1.0) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Atualiza tempo de vida
        p.life += dt * 0.5;
        if (p.life > 1.0) p.life -= 1.0;

        // Shift trails
        for (let h = 7; h > 0; h--) {
            p.history[h].x = p.history[h-1].x;
            p.history[h].y = p.history[h-1].y;
        }
        p.history[0].x = p.x;
        p.history[0].y = p.y;

        // Flow field via Curl Noise (Turbulência Fluida)
        const curl = curlNoise(p.x, p.y, time * 0.5);
        const flowForceX = curl.cx * 2.0 * p.z;
        const flowForceY = curl.cy * 2.0 * p.z;

        p.vx += flowForceX * dt * 60.0;
        p.vy += flowForceY * dt * 60.0;

        // Vibração browniana (jitter) com fastSin/fastCos
        const vibSeed = time * 5.0 + p.noiseOffset;
        p.vx += fastSin(vibSeed * 1.2) * 0.15 * p.z;
        p.vy += fastCos(vibSeed * 0.9) * 0.15 * p.z;

        // Atração magnética de Morph (com elástico interativo)
        const toTargetX = p.tx - p.x;
        const toTargetY = p.ty - p.y;
        
        // Atração baseada na distância (efeito mola)
        const springForce = 0.02 * morphStrength;
        const pullX = toTargetX * springForce;
        const pullY = toTargetY * springForce;

        p.vx += pullX;
        p.vy += pullY;

        // Atrito (Damping) dinâmico
        const damping = 0.85 - (0.05 * morphStrength);
        p.vx *= damping;
        p.vy *= damping;

        p.x += p.vx;
        p.y += p.vy;
    }
}

// Efeito de Vinheta e Fundo Premium
function drawBackground() {
    // Fundo base esmero de escuridão profunda
    ctx.fillStyle = "#010103";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradiente radial para vinheta rica (centro levemente mais claro)
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 100,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.8
    );
    gradient.addColorStop(0, "rgba(4, 8, 15, 0.9)");
    gradient.addColorStop(1, "rgba(0, 0, 2, 1.0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid(time) {
    // Linhas técnicas decorativas com efeito de fade e movimento (Parallax/Scanning sutil)
    ctx.lineWidth = 1.5;

    const gridSize = 150;
    const offsetX = (time * 10) % gridSize;
    const offsetY = (time * 5) % gridSize;

    ctx.beginPath();

    // Grid Principal Glow
    for (let x = offsetX; x < canvas.width; x += gridSize) {
        const opacity = Math.sin((x / canvas.width) * Math.PI) * 0.15;
        ctx.strokeStyle = `rgba(0, 242, 255, ${opacity})`;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
        const opacity = Math.sin((y / canvas.height) * Math.PI) * 0.15;
        ctx.strokeStyle = `rgba(0, 242, 255, ${opacity})`;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Grid Secundário (fino)
    ctx.beginPath();
    ctx.lineWidth = 0.5;
    for (let x = offsetX; x < canvas.width; x += gridSize / 2) {
        ctx.strokeStyle = `rgba(0, 242, 255, 0.05)`;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = offsetY; y < canvas.height; y += gridSize / 2) {
        ctx.strokeStyle = `rgba(0, 242, 255, 0.05)`;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

// Desenhar frame no canvas
function drawFrame(currentFrameIndex) {
    const currentTime = currentFrameIndex / targetFps;

    drawBackground();
    drawGrid(currentTime);

    // Configuração de Global Composite Operation para Neon Glow (Additive Blending)
    ctx.globalCompositeOperation = "screen";

    // Criar os arrays de caminhos Path2D para agrupar as chamadas de stroke/fill
    // 3 cores (0: Cyan, 1: Blue, 2: White) x 3 larguras x 4 níveis de opacidade
    const paths = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => new Path2D())));
    const headPaths = Array.from({ length: 3 }, () => new Path2D());

    // Desenhar partículas (Trails e Pontos)
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Algoritmo Alpha-Max Beta-Min para aproximação rápida de distância (sem Math.sqrt)
        const absVx = p.vx < 0 ? -p.vx : p.vx;
        const absVy = p.vy < 0 ? -p.vy : p.vy;
        const speed = absVx > absVy ? absVx + 0.4 * absVy : absVy + 0.4 * absVx;
        const factor = Math.min(1.0, Math.max(0.0, speed * 0.05));
        
        // Ciclo de cor sutil (Cyan para Azul Elétrico para Branco)
        const colorPhase = (p.colorOffset + currentTime * 0.1) % 1.0;

        let cIdx = 0; // Cyan
        if (colorPhase > 0.5) {
            cIdx = 1; // Blue
        } else if (speed > 15.0) {
            cIdx = 2; // White
        }

        // Fading dinâmico baseado no ciclo de vida e velocidade usando LUT fastSin
        const lifeFade = fastSin(p.life * Math.PI);
        const alpha = Math.min(1.0, (0.3 + factor * 0.7) * lifeFade);

        // Classificação do Trail
        const wVal = Math.max(0.5, (p.z * 1.5) * (1.0 + factor * 0.5));
        let wIdx = 0;
        if (wVal > 2.2) wIdx = 2;
        else if (wVal > 1.0) wIdx = 1;

        let aIdx = (alpha * 3) | 0;
        if (aIdx < 0) aIdx = 0;
        else if (aIdx > 3) aIdx = 3;

        // Desenhar rastro de cauda dinâmico (mais longo se rápido)
        const trailLength = Math.min(p.history.length, Math.max(2, Math.floor(speed * 0.8)));

        const path = paths[cIdx][wIdx][aIdx];
        path.moveTo(p.x, p.y);
        for (let h = 0; h < trailLength; h++) {
            path.lineTo(p.history[h].x, p.history[h].y);
        }

        // Cabeça da partícula (Glow core)
        if (p.z > 1.5 && alpha > 0.4) {
            const rVal = p.z * 1.2;
            const hPath = headPaths[cIdx];
            hPath.moveTo(p.x + rVal, p.y);
            hPath.arc(p.x, p.y, rVal, 0, Math.PI * 2);
        }
    }

    // Configurações de desenho
    const colorValues = [
        [0, 242, 255],   // Cyan
        [30, 180, 255],  // Blue
        [240, 250, 255]  // White
    ];
    const widthWeights = [0.6, 1.5, 3.0];
    const alphaWeights = [0.25, 0.5, 0.75, 1.0];

    // Renderizar todos os trails agrupados (reduz chamadas de stroke() em 99%)
    for (let c = 0; c < 3; c++) {
        const rgb = colorValues[c];
        for (let w = 0; w < 3; w++) {
            ctx.lineWidth = widthWeights[w];
            for (let a = 0; a < 4; a++) {
                ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alphaWeights[a]})`;
                ctx.stroke(paths[c][w][a]);
            }
        }
    }

    // Renderizar todas as cabeças agrupadas (reduz chamadas de fill() em 99%)
    for (let c = 0; c < 3; c++) {
        const rgb = colorValues[c];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.75)`;
        ctx.fill(headPaths[c]);
    }

    // Restaurar compósito padrão para UI/HUD
    ctx.globalCompositeOperation = "source-over";

    // Desenhar Overlay de Texto Dinâmico (se houver)
    if (currentTargetText !== "") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // fundo semi-transparente para o texto
        ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);

        ctx.font = "bold 48px 'Courier Prime', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Efeito Glitch/Sombra no texto
        ctx.fillStyle = "rgba(0, 242, 255, 0.7)";
        ctx.fillText(currentTargetText.toUpperCase(), canvas.width / 2 + 2, canvas.height / 2 + 2);

        ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
        ctx.fillText(currentTargetText.toUpperCase(), canvas.width / 2, canvas.height / 2);
    }

    // Telemetria HUD
    if (!isHeadless && hudTime) {
        hudTime.innerText = `${currentTime.toFixed(2)}s`;
    }
}

// Simulação sequencial determinística para seek frame-accurate
function runSimulationToTime(timeSeconds) {
    initSimulation();
    const dt = 1 / targetFps;
    const steps = Math.floor(timeSeconds * targetFps);
    
    // Mapeamento e transição sequencial dos targets visuais
    for (let step = 0; step < steps; step++) {
        const t = step * dt;
        
        // Encontrar o visual correspondente ao tempo t
        let visualIdx = 0;
        for (let i = 0; i < timelines.length; i++) {
            if (t >= timelines[i]) {
                visualIdx = i + 1;
            }
        }
        const visual = visuals[visualIdx] || visuals[0];
        
        applyVisualTarget(visual);
        updatePhysics(dt, t, visual.particles.morph_strength);
    }
}

// Protocolo de Gravação HyperFrames
let initialized = false;

window.__appReady = false;

window.initializeScene = async function() {
    if (!initialized) {
        await loadResources();
        initialized = true;
        window.__appReady = true;
    }
};

let lastSimulatedTime = -1;

window.__hf = {
    duration: duration,
    seek: async (timeSeconds) => {
        if (!initialized) {
            await loadResources();
            initialized = true;
            window.__appReady = true;
            lastSimulatedTime = -1;
        }
        
        const dt = 1 / targetFps;
        const currentStep = Math.floor(timeSeconds * targetFps);
        const lastStep = lastSimulatedTime >= 0 ? Math.floor(lastSimulatedTime * targetFps) : -1;

        if (lastStep >= 0 && currentStep > lastStep) {
            // Avança a simulação sequencialmente a partir do último estado, independentemente do FPS de gravação
            for (let step = lastStep; step < currentStep; step++) {
                const t = step * dt;
                let visualIdx = 0;
                for (let i = 0; i < timelines.length; i++) {
                    if (t >= timelines[i]) {
                        visualIdx = i + 1;
                    }
                }
                const visual = visuals[visualIdx] || visuals[0];
                applyVisualTarget(visual);
                updatePhysics(dt, t, visual.particles.morph_strength);
            }
            lastSimulatedTime = timeSeconds;
        } else if (timeSeconds === 0) {
            initSimulation();
            lastSimulatedTime = 0;
        } else {
            runSimulationToTime(timeSeconds);
            lastSimulatedTime = timeSeconds;
        }
        
        const frameIndex = Math.min(
            Math.floor(timeSeconds * targetFps),
            Math.floor(duration * targetFps) - 1
        );
        
        // Aplica o target do frame final
        let visualIdx = 0;
        for (let i = 0; i < timelines.length; i++) {
            if (timeSeconds >= timelines[i]) {
                visualIdx = i + 1;
            }
        }
        applyVisualTarget(visuals[visualIdx] || visuals[0]);

        drawFrame(frameIndex);
    }
};

window.renderFrame = async (tMs) => {
    await window.__hf.seek(tMs / 1000);
};

// Inicialização Live Preview
window.onload = async () => {
    await loadResources();
    initialized = true;
    window.__appReady = true;

    if (!isHeadless) {
        initSimulation();
        let startTime = performance.now();
        
        function loop() {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > duration) {
                startTime = performance.now();
            }
            
            let visualIdx = 0;
            for (let i = 0; i < timelines.length; i++) {
                if (elapsed >= timelines[i]) {
                    visualIdx = i + 1;
                }
            }
            const visual = visuals[visualIdx] || visuals[0];
            
            applyVisualTarget(visual);
            updatePhysics(1/targetFps, elapsed, visual.particles.morph_strength);
            
            const frameIndex = Math.floor(elapsed * targetFps);
            drawFrame(frameIndex);
            requestAnimationFrame(loop);
        }
        loop();
    }
};
