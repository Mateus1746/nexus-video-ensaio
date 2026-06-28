// ============================================================
// SOVEREIGN ENSAY - PARTICLE TRANSITION FRONTEND ENGINE (SOTA 2026)
// ============================================================

const numParticles = 6000;
const targetFps = 30;
const canvas = document.getElementById("video-canvas");
const ctx = canvas.getContext("2d");
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


// Extrai e projeta pontos do GeoJSON com espalhamento orgânico para preenchimento
function extractPointsFromGeoJSON(geojson) {
    const coords = [];
    let pointSeed = 0;
    function deterministicRandomLocal() {
        let x = Math.sin(pointSeed++) * 10000;
        return x - Math.floor(x);
    }

    geojson.features.forEach(f => {
        if (f.geometry.type === "Polygon") {
            f.geometry.coordinates.forEach(ring => {
                ring.forEach(c => {
                    const p = project(c[0], c[1]);
                    // Adiciona ruído espacial para o mapa ficar menos esparso e mais orgânico
                    p.x += (deterministicRandomLocal() - 0.5) * 8.0;
                    p.y += (deterministicRandomLocal() - 0.5) * 8.0;
                    coords.push(p);
                });
            });
        } else if (f.geometry.type === "MultiPolygon") {
            f.geometry.coordinates.forEach(poly => {
                poly.forEach(ring => {
                    ring.forEach(c => {
                        const p = project(c[0], c[1]);
                        p.x += (deterministicRandomLocal() - 0.5) * 8.0;
                        p.y += (deterministicRandomLocal() - 0.5) * 8.0;
                        coords.push(p);
                    });
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
        for (let h = 0; h < 12; h++) {
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
        for (let h = 11; h > 0; h--) {
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

        // Atração magnética de Morph com variação fluida
        const toTargetX = p.tx - p.x;
        const toTargetY = p.ty - p.y;
        const distTarget = Math.sqrt(toTargetX*toTargetX + toTargetY*toTargetY) || 0.1;
        
        // Efeito elástico que estica mais quando distante
        const elastic = Math.min(distTarget * 0.02, 3.0);
        const pullX = (toTargetX / distTarget) * elastic * morphStrength;
        const pullY = (toTargetY / distTarget) * elastic * morphStrength;

        // Efeito de redemoinho (vortex) próximo ao alvo
        const vortexPower = Math.max(0, 1.0 - distTarget / 200.0) * morphStrength * 0.5;
        const vortexX = -pullY * vortexPower;
        const vortexY = pullX * vortexPower;

        p.vx += pullX + vortexX;
        p.vy += pullY + vortexY;

        const drag = 1.0 - (0.10 * morphStrength);
        p.vx *= drag;
        p.vy *= drag;


        p.x += p.vx;
        p.y += p.vy;
    }
}

// Desenhar frame no canvas
function drawFrame(currentFrameIndex) {

    // Fundo esmero de escuridão profunda com vignette
    const bgGradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 200, canvas.width/2, canvas.height/2, canvas.width);
    bgGradient.addColorStop(0, "#080b12");
    bgGradient.addColorStop(1, "#020305");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linhas técnicas decorativas animadas
    const gridOffset = (currentFrameIndex % 200) / 200.0 * 200;
    ctx.strokeStyle = "rgba(0, 242, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = gridOffset - 200; x < canvas.width; x += 150) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = gridOffset - 200; y < canvas.height; y += 150) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();


    // HUD Elements direct on canvas
    ctx.fillStyle = "rgba(0, 242, 255, 0.9)";
    ctx.font = "bold 18px 'Courier Prime', monospace";
    ctx.shadowColor = "rgba(0, 242, 255, 0.8)";
    ctx.shadowBlur = 10;

    const timeStr = (currentFrameIndex / targetFps).toFixed(3);
    ctx.fillText(`SYS.OP // T+ ${timeStr}s`, 60, 60);
    ctx.fillText(`TRGT LOCK: [${hudTarget.innerText.toUpperCase()}]`, 60, 90);

    // Dynamic entropy bar
    const entropy = Math.abs(Math.sin((currentFrameIndex/targetFps)*2.0)) * 100;
    ctx.fillText(`ENTROPY: ${entropy.toFixed(1)}%`, 60, 120);
    ctx.fillRect(60, 135, entropy * 2, 4);

    // Crosshair at center
    ctx.strokeStyle = "rgba(0, 242, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width/2 - 20, canvas.height/2);
    ctx.lineTo(canvas.width/2 + 20, canvas.height/2);
    ctx.moveTo(canvas.width/2, canvas.height/2 - 20);
    ctx.lineTo(canvas.width/2, canvas.height/2 + 20);
    ctx.stroke();

    ctx.shadowBlur = 0; // Reset shadow for particles

    // Desenhar partículas

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Bloom de cor baseado na velocidade e distância do alvo
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        const toTargetX = p.tx - p.x;
        const toTargetY = p.ty - p.y;
        const distTarget = Math.sqrt(toTargetX*toTargetX + toTargetY*toTargetY) || 0.1;

        const speedFactor = Math.min(1.0, Math.max(0.0, speed * 0.08));
        const distFactor = Math.min(1.0, distTarget / 300.0);
        
        // Transição de cor: neon cyan quando organizado, laranja/vermelho quando em trânsito
        const r = Math.round(255 * distFactor);
        const g = Math.round(242 * (1 - distFactor) + 100 * distFactor);
        const b = Math.round(255 * (1 - distFactor));

        const alpha = 0.3 + (1 - distFactor) * 0.7; // Brilha mais quando chega no alvo

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        // Desenhar rastro de cauda com opacidade decrescente
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        for (let h = 0; h < 12; h++) {
            ctx.lineTo(p.history[h].x, p.history[h].y);
        }
        ctx.lineWidth = (p.z * 1.5) + (1 - distFactor) * 1.5;
        ctx.stroke();

        // Ponto central mais brilhante
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.z * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

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

window.__appReady = false;

window.initializeScene = async function() {
    if (!initialized) {
        await loadResources();
        initialized = true;
        window.__appReady = true;
    }
};

window.__hf = {
    duration: duration,
    seek: async (timeSeconds) => {
        if (!initialized) {
            await loadResources();
            initialized = true;
            window.__appReady = true;
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
