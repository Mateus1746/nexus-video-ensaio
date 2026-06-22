// ============================================================
// SOVEREIGN ENSAY - PARTICLE TRANSITION FRONTEND ENGINE (SOTA 2026)
// ============================================================

const numParticles = 2000;
const targetFps = 30;
const canvas = document.getElementById("video-canvas");
// preserveDrawingBuffer if webgl, but for 2d we use willReadFrequently if needed or just getContext
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const hudTime = document.getElementById("hud-time");
const hudTarget = document.getElementById("hud-target");

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
            z: 0.5 + deterministicRandom() * 1.5,
            noiseOffset: deterministicRandom() * 1000,
            history: []
        };
        for (let h = 0; h < 5; h++) {
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

    // 3. Pré-carregar ícones
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

// Configura o target das partículas para o visual corrente
function applyVisualTarget(visual) {
    let targetKey = "test_assets/world.json";
    if (visual.particles.target_icon) {
        targetKey = visual.particles.target_icon;
    } else if (visual.particles.target_map) {
        targetKey = visual.particles.target_map;
    }

    const points = sampledShapes[targetKey] || sampledShapes["test_assets/world.json"];
    for (let i = 0; i < particles.length; i++) {
        particles[i].tx = points[i].x;
        particles[i].ty = points[i].y;
    }
    hudTarget.innerText = targetKey.split("/").pop();
}

// Atualização física das partículas
function updatePhysics(dt, time, morphStrength = 1.0) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Shift trails
        for (let h = 4; h > 0; h--) {
            p.history[h].x = p.history[h-1].x;
            p.history[h].y = p.history[h-1].y;
        }
        p.history[0].x = p.x;
        p.history[0].y = p.y;

        // Física básica
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.1;

        // Movimento de atração polar
        const vrx = dx / dist;
        const vry = dy / dist;
        const vtx = -vry;
        const vty = vrx;

        const speed = 1.2 * p.z;
        const ax = (vrx * (-0.1) + vtx * speed) * 0.05;
        const ay = (vry * (-0.1) + vty * speed) * 0.05;

        p.vx = (p.vx + ax) * 0.95;
        p.vy = (p.vy + ay) * 0.95;

        // Vibração browniana
        const vibSeed = time * 3.0 + p.noiseOffset;
        p.vx += Math.sin(vibSeed * 1.2) * 0.08 * p.z;
        p.vy += Math.cos(vibSeed * 0.9) * 0.08 * p.z;

        // Atração magnética de Morph
        const toTargetX = p.tx - p.x;
        const toTargetY = p.ty - p.y;
        const distTarget = Math.sqrt(toTargetX*toTargetX + toTargetY*toTargetY) || 0.1;
        
        const pullX = (toTargetX / distTarget) * Math.min(distTarget * 0.05, 5.0) * morphStrength;
        const pullY = (toTargetY / distTarget) * Math.min(distTarget * 0.05, 5.0) * morphStrength;

        p.vx += pullX;
        p.vy += pullY;
        p.vx *= (1.0 - (0.15 * morphStrength));
        p.vy *= (1.0 - (0.15 * morphStrength));

        p.x += p.vx;
        p.y += p.vy;
    }
}

// Desenhar frame no canvas
function drawFrame(currentFrameIndex) {
    // Fundo esmero de escuridão profunda
    ctx.fillStyle = "#030305";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linhas técnicas decorativas
    ctx.strokeStyle = "rgba(0, 242, 255, 0.02)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 100; x < canvas.width; x += 200) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = 100; y < canvas.height; y += 200) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Desenhar partículas
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Bloom de cor baseado na velocidade
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        const factor = Math.min(1.0, Math.max(0.1, speed * 0.04));
        
        // Glow cyan (#00f2ff) a azul escuro
        const r = 0;
        const g = Math.round(150 + factor * 105);
        const b = 255;
        const alpha = 0.2 + factor * 0.6;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        // Desenhar rastro de cauda
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        for (let h = 0; h < 5; h++) {
            ctx.lineTo(p.history[h].x, p.history[h].y);
        }
        ctx.lineWidth = p.z * 1.2;
        ctx.stroke();
    }

    // Telemetria HUD
    const currentTime = currentFrameIndex / targetFps;
    hudTime.innerText = `${currentTime.toFixed(2)}s`;
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

window.__hf = {
    duration: duration,
    seek: async (timeSeconds) => {
        if (!initialized) {
            await loadResources();
            initialized = true;
        }
        runSimulationToTime(timeSeconds);
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
        await new Promise(resolve => requestAnimationFrame(resolve));
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

    const isHeadless = new URLSearchParams(window.location.search).get("headless") === "true";
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
