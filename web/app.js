// ============================================================
// SOVEREIGN ENSAY - THREE.JS DOCUMENTARY ENGINE (SOTA Vox Style)
// ============================================================

const canvas = document.getElementById("video-canvas");
const targetFps = 30;
const isHeadless = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("headless") === "true";

let renderer, scene, camera, spotLight, docMesh, composer, bokehPass;
let narrativeData = [];
let assetsConfig = { track_bpm: 120 };
let currentSceneIndex = -1;

// Carregar JSONs
async function loadData() {
    try {
        const resConfig = await fetch('../assets_config.json');
        if (resConfig.ok) {
            assetsConfig = await resConfig.json();
        }
    } catch(e) { console.warn("assets_config.json não carregado", e); }
    
    try {
        const response = await fetch('../pipeline/master_script.json');
        if (response.ok) {
            narrativeData = await response.json();
        } else {
            narrativeData = [{ title: "Falha", text: "Não foi possível ler roteiro." }];
        }
    } catch (e) {
        narrativeData = [{ title: "Falha", text: "Não foi possível ler roteiro." }];
    }
}

// Criar texturas procedurais de papel para Normal Map / Roughness
function generatePaperTextures(sceneIdx) {
    const size = 1024;
    const canvasAlbedo = document.createElement('canvas');
    canvasAlbedo.width = size;
    canvasAlbedo.height = size;
    const ctxA = canvasAlbedo.getContext('2d');

    // Fundo base
    ctxA.fillStyle = '#f0ecd8'; // papel marfim envelhecido
    ctxA.fillRect(0, 0, size, size);

    // Adicionar ruído visual para o Albedo
    for(let i=0; i<10000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 2;
        ctxA.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
        ctxA.beginPath();
        ctxA.arc(x,y,r,0,Math.PI*2);
        ctxA.fill();
    }

    // Desenhar conteúdo do Documento (baseado no JSON)
    ctxA.fillStyle = '#111';
    ctxA.font = 'bold 60px "Courier Prime", monospace';
    const title = narrativeData[sceneIdx]?.title || 'TOP SECRET';
    ctxA.fillText(title, 80, 150);

    ctxA.font = '35px "Space Grotesk", sans-serif';
    const text = narrativeData[sceneIdx]?.text || '';
    const words = text.split(' ');
    let line = '';
    let y = 250;
    for(let i=0; i<words.length; i++){
        let testLine = line + words[i] + ' ';
        if(ctxA.measureText(testLine).width > size - 160 && i>0){
            ctxA.fillText(line, 80, y);
            line = words[i] + ' ';
            y += 50;
        }else{
            line = testLine;
        }
    }
    ctxA.fillText(line, 80, y);

    // Normal Map Procedural (amassados)
    const canvasNormal = document.createElement('canvas');
    canvasNormal.width = size;
    canvasNormal.height = size;
    const ctxN = canvasNormal.getContext('2d');
    ctxN.fillStyle = '#8080ff'; // Cor base normal (flat Z)
    ctxN.fillRect(0, 0, size, size);

    // Criar vincos no normal map
    for(let i=0; i<15; i++) {
        ctxN.strokeStyle = `rgb(${128 + Math.random()*50}, ${128 + Math.random()*50}, 255)`;
        ctxN.lineWidth = Math.random() * 20 + 5;
        ctxN.beginPath();
        ctxN.moveTo(Math.random() * size, 0);
        ctxN.lineTo(Math.random() * size, size);
        ctxN.stroke();
    }

    // Roughness Map
    const canvasRough = document.createElement('canvas');
    canvasRough.width = size;
    canvasRough.height = size;
    const ctxR = canvasRough.getContext('2d');
    ctxR.fillStyle = '#cccccc'; // Muito áspero base
    ctxR.fillRect(0, 0, size, size);
    for(let i=0; i<5000; i++) {
        ctxR.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#999999';
        ctxR.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    return {
        map: new THREE.CanvasTexture(canvasAlbedo),
        normalMap: new THREE.CanvasTexture(canvasNormal),
        roughnessMap: new THREE.CanvasTexture(canvasRough)
    };
}

function updateDocumentTexture(sceneIdx) {
    if (!docMesh) return;
    const textures = generatePaperTextures(sceneIdx);
    docMesh.material.map = textures.map;
    docMesh.material.normalMap = textures.normalMap;
    docMesh.material.roughnessMap = textures.roughnessMap;
    docMesh.material.needsUpdate = true;
}

// Configuração Básica do Three.js
function initThree() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setSize(1920, 1080);
    renderer.setPixelRatio(isHeadless ? 1 : window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D0D1A);

    camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const gridHelper = new THREE.GridHelper(100, 100, 0x1A1A2E, 0x1A1A2E);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -5;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.4;
    scene.add(gridHelper);

    spotLight = new THREE.SpotLight(0xFAF9F6, 3);
    spotLight.position.set(2, 10, 15);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.6;
    spotLight.decay = 1.5;
    spotLight.distance = 50;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.bias = -0.0005;
    scene.add(spotLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const docGeometry = new THREE.PlaneGeometry(8, 11);
    const textures = generatePaperTextures(0);

    const docMaterial = new THREE.MeshStandardMaterial({
        map: textures.map,
        normalMap: textures.normalMap,
        roughnessMap: textures.roughnessMap,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.1,
    });

    docMesh = new THREE.Mesh(docGeometry, docMaterial);
    docMesh.castShadow = true;
    docMesh.receiveShadow = true;
    scene.add(docMesh);

    const rimLight = new THREE.PointLight(0x00f2ff, 1, 20);
    rimLight.position.set(-5, 0, 2);
    scene.add(rimLight);
}

let blurIntensity = 0;

// 🎬 Engenharia de Animação e Pacing
function setupAnimations() {
    const bpm = assetsConfig.track_bpm || 120;
    const beatInterval = 60000 / bpm / 1000; // Segundos por batida

    const tl = gsap.timeline({ paused: true });
    const jitter = () => (Math.random() - 0.5) * 0.05;

    let currentTime = 0;

    narrativeData.forEach((sceneData, index) => {
        let sceneDuration = beatInterval * 16;
        
        // Atualiza a textura no início de cada cena
        tl.add(() => {
             updateDocumentTexture(index);
        }, currentTime);

        if (sceneData.layout === 'floating_focus') {
            tl.to(camera.position, { z: 9, duration: sceneDuration, ease: "power4.out" }, currentTime);
            tl.to(docMesh.rotation, { x: -0.15 + jitter(), y: 0.1 + jitter(), duration: sceneDuration, ease: "power2.out" }, currentTime);
        } else if (sceneData.layout === 'split_screen') {
            tl.to(camera.position, { x: 4, z: 10, duration: 1.0, ease: "power4.out" }, currentTime);
            tl.to(docMesh.rotation, { y: -0.2, duration: 1.0, ease: "power2.out" }, currentTime);
        } else if (sceneData.layout === 'document_inspect') {
            tl.to(camera.position, { x: 0, y: -2, z: 5, duration: 2.0, ease: "power4.out" }, currentTime);
            tl.to(docMesh.rotation, { x: 0, y: 0, duration: 2.0, ease: "power2.out" }, currentTime);
        } else {
            tl.to(camera.position, { z: 8, duration: sceneDuration, ease: "power4.out" }, currentTime);
        }

        tl.add(() => {
            const subtitleEl = document.getElementById('subtitle-container');
            if (subtitleEl) subtitleEl.innerText = sceneData.text || '';

            const annotationsEl = document.getElementById('annotations-layer');
            if (annotationsEl) {
                annotationsEl.innerHTML = '';
                if (sceneData.annotations && sceneData.annotations.length > 0) {
                    sceneData.annotations.forEach((ann, aIdx) => {
                        const mark = document.createElement('div');
                        if (ann.type === 'highlight') {
                            mark.className = 'annotation-highlight';
                            mark.innerHTML = `<span class="highlight-inner">${ann.text}</span>`;
                            mark.style.top = `${40 + aIdx*10}%`;
                            mark.style.left = '30%';
                        } else if (ann.type === 'circle') {
                            mark.className = 'annotation-circle';
                            mark.innerHTML = `<svg width="300" height="100" viewBox="0 0 300 100">
                                <path class="hand-drawn-path" d="M 10,50 Q 150,10 290,50 Q 150,90 10,50 Z" fill="none" stroke="red" stroke-width="4"/>
                            </svg>`;
                            mark.style.top = `${50 + aIdx*10}%`;
                            mark.style.left = '30%';
                        }
                        annotationsEl.appendChild(mark);
                    });
                }
            }
        }, currentTime);

        currentTime += sceneDuration;

        // Transição Whip-Pan
        if (index < narrativeData.length - 1) {
            tl.to(camera.rotation, {
                y: Math.PI/3,
                duration: 0.4,
                ease: "power4.in",
                onUpdate: function() {
                    blurIntensity = Math.abs(this.targets()[0].y) * 10;
                    document.getElementById('video-canvas').style.filter = `blur(${blurIntensity}px)`;
                }
            }, currentTime);

            tl.set(camera.rotation, { y: -Math.PI/3 });

            tl.to(camera.rotation, {
                y: 0,
                duration: 0.4,
                ease: "power4.out",
                onUpdate: function() {
                    blurIntensity = Math.abs(this.targets()[0].y) * 10;
                    document.getElementById('video-canvas').style.filter = `blur(${blurIntensity}px)`;
                }
            }, currentTime + 0.4);

            currentTime += 0.8;
        }
    });

    return tl;
}

let masterTimeline;

function drawFrame(timeSeconds) {
    if (masterTimeline) {
        masterTimeline.seek(timeSeconds);
    }

    // Atualiza HUD no loop
    if (!isHeadless && document.getElementById("hud-time")) {
         document.getElementById("hud-time").innerText = timeSeconds.toFixed(2) + "s";
    }

    spotLight.position.x = 2 + Math.sin(timeSeconds * 1.5) * 1.5;
    spotLight.position.z = 15 + Math.cos(timeSeconds * 0.5) * 2;
    
    renderer.render(scene, camera);
}

let initialized = false;
window.__appReady = false;

window.initializeScene = async function() {
    if (!initialized) {
        await loadData();
        initThree();
        masterTimeline = setupAnimations();
        window.__hf.duration = masterTimeline.duration() || 30.0;
        initialized = true;
        window.__appReady = true;
    }
};

window.__hf = {
    duration: 30.0, // Default fall back
    seek: async (timeSeconds) => {
        if (!initialized) {
            await window.initializeScene();
        }
        drawFrame(timeSeconds);
    }
};

window.renderFrame = async (tMs) => {
    await window.__hf.seek(tMs / 1000);
};

window.onload = async () => {
    await window.initializeScene();

    if (!isHeadless) {
        let startTime = performance.now();
        function loop() {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > window.__hf.duration) {
                startTime = performance.now();
            }
            drawFrame(elapsed);
            requestAnimationFrame(loop);
        }
        loop();
    }
};
