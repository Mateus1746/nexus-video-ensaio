// ============================================================
// SOVEREIGN ENSAY - THREE.JS SOTA EDITORIAL ENGINE
// ============================================================

const targetFps = 30;
let duration = 60.0;
const canvas = document.getElementById("video-canvas");
const hudTime = document.getElementById("hud-time");
const subtitleText = document.getElementById("subtitle-text");
const isHeadless = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("headless") === "true";

let renderer, scene, camera, documentMesh, spotlight, ambientLight, gridHelper;
let initialized = false;

let bpmConfig = null;
let crawlerData = null;

let animationTimeline = null;
let currentPhaseIndex = -1;

// Quintic Ease-Out custom easing for determinism
function quinticEaseOut(t) {
    return 1 - Math.pow(1 - t, 5);
}

// Cubic bezier swift-out for highlights
function cubicBezier(t, p1x, p1y, p2x, p2y) {
    // simplified for specific swift-out (0.4, 0, 0.2, 1) if needed, using simple ease out for now
    return 1 - Math.pow(1 - t, 3);
}

async function loadResources() {
    try {
        const bpmRes = await fetch('../assets/assets_config.json');
        bpmConfig = await bpmRes.json();

        const crawlerRes = await fetch('../assets/crawler_data.json');
        crawlerData = await crawlerRes.json();

        console.log("Resources loaded:", bpmConfig, crawlerData);
    } catch (e) {
        console.error("Error loading resources:", e);
        // Fallbacks
        bpmConfig = { bpm: 120 };
        crawlerData = { layout: "split_screen", annotations: [] };
    }
}

function initThreeJS() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setSize(1920, 1080);
    renderer.setPixelRatio(isHeadless ? 1 : window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombra física suave

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D0D1A);
    scene.fog = new THREE.FogExp2(0x0D0D1A, 0.015); // Depth of Field simplificado

    camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 0, 0);

    // Grid Mesh
    gridHelper = new THREE.GridHelper(200, 100, 0x1A1A2E, 0x1A1A2E);
    gridHelper.position.y = -10;
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Iluminação
    ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
    scene.add(ambientLight);

    spotlight = new THREE.SpotLight(0xFAF9F6, 1.5);
    spotlight.position.set(10, 20, 15);
    spotlight.angle = Math.PI / 4;
    spotlight.penumbra = 0.5;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    spotlight.shadow.bias = -0.0001;
    scene.add(spotlight);

    createDocumentMesh();
    buildAnimationTimeline();
}

function createDocumentMesh() {
    const geometry = new THREE.PlaneGeometry(16, 9, 32, 32);

    // Core Mass: Textura e Normal Map procedural base para papel
    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = 1024;
    canvasTexture.height = 1024;
    const ctx = canvasTexture.getContext('2d');

    // Paper background
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, 1024, 1024);

    // Simulating text layout
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 60px Courier Prime';
    ctx.fillText('TOP SECRET DECLASSIFIED', 100, 120);

    // Draw annotations if any
    if (crawlerData && crawlerData.annotations) {
        let yOffset = 250;
        crawlerData.annotations.forEach((ann, idx) => {
            ctx.font = '40px Courier Prime';
            ctx.fillStyle = '#333333';
            ctx.fillText(ann.phrase, 100, yOffset);

            if (ann.type === 'highlight') {
                ctx.fillStyle = 'rgba(255, 204, 0, 0.5)';
                ctx.fillRect(90, yOffset - 35, 800, 45); // Static mock highlight
            } else if (ann.type === 'circle') {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.ellipse(450, yOffset - 15, 400, 40, 0, 0, 2 * Math.PI);
                ctx.stroke();
            }
            yOffset += 100;
        });
    } else {
        for(let i=0; i<10; i++) {
            ctx.fillRect(100, 250 + i * 50, 800 - Math.random() * 200, 20);
        }
    }

    const paperTexture = new THREE.CanvasTexture(canvasTexture);

    const material = new THREE.MeshStandardMaterial({
        map: paperTexture,
        roughness: 0.9,
        metalness: 0.1,
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    documentMesh = new THREE.Mesh(geometry, material);
    documentMesh.castShadow = true;
    documentMesh.receiveShadow = true;
    scene.add(documentMesh);
}

function buildAnimationTimeline() {
    const bpm = bpmConfig.bpm || 120;
    const beatIntervalSec = 60 / bpm; // ms to seconds

    // Calculate layouts
    const layout = crawlerData.layout || "split_screen";

    // Create deterministic keyframes
    animationTimeline = [];

    // Every 8 beats, we change the scene slightly
    const phaseDuration = beatIntervalSec * 8;
    const totalPhases = Math.ceil(duration / phaseDuration);

    let lastX = 0, lastZ = 30, lastRotX = 0, lastRotY = 0;

    for (let i = 0; i < totalPhases; i++) {
        let targetX = 0, targetY = 0, targetZ = 30;
        let targetRotX = 0, targetRotY = 0, targetRotZ = 0;
        let subtitle = "";
        
        let phaseType = i % 3;
        
        if (layout === "split_screen") {
            targetX = -8; targetZ = 20; targetRotY = Math.PI / 10;
        } else if (layout === "floating_focus") {
            targetX = 0; targetZ = 15; targetRotX = -Math.PI / 12; targetRotY = (Math.random() - 0.5) * 0.2;
        } else if (layout === "document_inspect") {
            targetX = 0; targetZ = 8; targetRotX = -Math.PI / 4;
        }

        // Add some variation
        targetX += (Math.random() - 0.5) * 2;
        targetRotY += (Math.random() - 0.5) * 0.1;

        if (crawlerData.annotations && crawlerData.annotations[i % crawlerData.annotations.length]) {
            subtitle = crawlerData.annotations[i % crawlerData.annotations.length].phrase;
        }

        animationTimeline.push({
            timeStart: i * phaseDuration,
            timeEnd: (i + 1) * phaseDuration,
            startX: lastX, startZ: lastZ, startRotX: lastRotX, startRotY: lastRotY,
            targetX, targetZ, targetRotX, targetRotY,
            subtitle
        });

        lastX = targetX; lastZ = targetZ; lastRotX = targetRotX; lastRotY = targetRotY;
    }
}

// Atualização de cena determinística
function updateScene(timeSeconds) {
    if (!initialized || !animationTimeline) return;

    if (!isHeadless && hudTime) {
        hudTime.innerText = `${timeSeconds.toFixed(2)}s`;
    }

    // Find current phase
    let currentPhase = animationTimeline[0];
    for (let i = 0; i < animationTimeline.length; i++) {
        if (timeSeconds >= animationTimeline[i].timeStart && timeSeconds < animationTimeline[i].timeEnd) {
            currentPhase = animationTimeline[i];
            break;
        }
    }

    if (!currentPhase) return;

    // Progress in current phase [0, 1]
    let progress = (timeSeconds - currentPhase.timeStart) / (currentPhase.timeEnd - currentPhase.timeStart);
    progress = Math.min(1, Math.max(0, progress));

    // Apply easing
    const easedProgress = quinticEaseOut(progress);

    // Jitter rotacional contínuo
    const jitterX = Math.sin(timeSeconds * 2.0) * 0.05;
    const jitterY = Math.cos(timeSeconds * 1.5) * 0.05;

    // Deterministic interpolation
    camera.position.x = currentPhase.startX + (currentPhase.targetX - currentPhase.startX) * easedProgress;
    camera.position.z = currentPhase.startZ + (currentPhase.targetZ - currentPhase.startZ) * easedProgress;

    documentMesh.rotation.x = currentPhase.startRotX + (currentPhase.targetRotX - currentPhase.startRotX) * easedProgress + jitterX;
    documentMesh.rotation.y = currentPhase.startRotY + (currentPhase.targetRotY - currentPhase.startRotY) * easedProgress + jitterY;

    // Atualiza luz baseada no tempo
    spotlight.position.x = 10 + Math.sin(timeSeconds) * 5;

    // Motion blur procedural via velocidade simulada
    // Se a câmera se mover muito rápido, aumentamos a velocidade percebida
    let vel = Math.abs(currentPhase.targetX - currentPhase.startX) * (easedProgress < 0.2 ? 5 : 0);
    // document.getElementById('wrapper').style.filter = vel > 5 ? `blur(${vel * 0.15}px)` : 'none'; // Whip pan

    if (subtitleText && subtitleText.innerText !== currentPhase.subtitle) {
        subtitleText.innerText = currentPhase.subtitle;
    }

    renderer.render(scene, camera);
}

// Protocolo de Gravação HyperFrames
window.__appReady = false;

window.__hf = {
    duration: duration,
    seek: async (timeMs) => {
        if (!initialized) {
            await loadResources();
            initThreeJS();
            initialized = true;
            window.__appReady = true;
        }
        updateScene(timeMs / 1000);
    }
};

window.renderFrame = async (tMs) => {
    await window.__hf.seek(tMs);
};

// Inicialização Live Preview
window.onload = async () => {
    await loadResources();
    initThreeJS();
    initialized = true;
    window.__appReady = true;

    if (!isHeadless) {
        let startTime = performance.now();
        
        function loop() {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > duration) {
                startTime = performance.now();
            }
            updateScene(elapsed);
            requestAnimationFrame(loop);
        }
        loop();
    }
};
