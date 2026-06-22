# GPU Particle System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a high-performance, compute-shader-driven particle system in `nexus_renderizador`, controlled via `narrative.json`, capable of simulating millions of particles for 12-minute data-driven history videos.

**Architecture:**
- **Physics**: A WGSL compute shader (`particles.wgsl`) handles particle dynamics (position, velocity, lifetime) using Euler integration and field forces.
- **Storage**: Particle state is managed in GPU Storage Buffers.
- **Rendering**: `render.wgsl` is updated with a specialized pass for particles (type 11.0), drawing them as SDF circles or textured quads.
- **Control**: `SceneCompiler` parses particle-specific parameters from `narrative.json` and updates the simulation constants per frame.

**Tech Stack:** Rust, WGPU (WGSL), Serde, FFmpeg.

---

### Task 1: Particle Data Structures and Compute Shader

**Files:**
- Create: `shaders/particles.wgsl`
- Modify: `src/rasterizer.rs`

- [ ] **Step 1: Define Particle struct in Rust**

Add the `Particle` struct to `src/rasterizer.rs`.

```rust
#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Particle {
    pub pos: [f32; 2],
    pub vel: [f32; 2],
    pub life: f32,
    pub size: f32,
    pub color_idx: f32,
    pub _pad: f32,
}
```

- [ ] **Step 2: Create `shaders/particles.wgsl`**

Implement basic physics, field forces (highways), and attractors.

```wgsl
struct Particle {
    pos: vec2<f32>,
    vel: vec2<f32>,
    life: f32,
    size: f32,
    color_idx: f32,
    _pad: f32,
};

struct SimParams {
    width: f32,
    height: f32,
    dt: f32,
    speed_base: f32,
    turbulence: f32,
    attraction: f32,
    particle_count: u32,
    seed: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;

fn hash(n: f32) -> f32 {
    return fract(sin(n) * 43758.5453123);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= params.particle_count) { return; }

    var p = particles[idx];
    
    // basic field flow logic
    let angle = atan2(p.pos.y - params.height * 0.5, p.pos.x - params.width * 0.5);
    let highway = -sin(angle * 4.0) * params.attraction;
    
    let acc = vec2<f32>(cos(angle), sin(angle)) * params.speed_base + 
              vec2<f32>(-sin(angle), cos(angle)) * highway;

    p.vel = (p.vel + acc * params.dt) * 0.95;
    p.pos += p.vel;

    // Boundary check / Reset
    if (p.pos.x < -50.0 || p.pos.x > params.width + 50.0 || p.pos.y < -50.0 || p.pos.y > params.height + 50.0) {
        p.pos = vec2<f32>(params.width * 0.5, params.height * 0.5);
        p.vel = vec2<f32>(0.0);
    }

    particles[idx] = p;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/rasterizer.rs shaders/particles.wgsl
git commit -m "feat: add particle data structures and compute shader"
```

### Task 2: Update HeadlessRenderer with Particle Buffers

**Files:**
- Modify: `src/rasterizer.rs`

- [ ] **Step 1: Add particle buffers and pipeline to `HeadlessRenderer`**

Add `particle_buffer`, `particle_pipeline`, and `sim_params_buffer`.

- [ ] **Step 2: Initialize buffers in `HeadlessRenderer::new`**

Create a storage buffer for 1,000,000 particles and a uniform buffer for simulation parameters.

- [ ] **Step 3: Commit**

```bash
git add src/rasterizer.rs
git commit -m "feat: initialize particle buffers and compute pipeline in HeadlessRenderer"
```

### Task 3: Particle Rendering Pass in `render.wgsl`

**Files:**
- Modify: `shaders/render.wgsl`

- [ ] **Step 1: Add particle vertex/fragment logic**

Implement `p_type == 11.0` for drawing particles from the storage buffer.

```wgsl
// In VS
if (p_type == 11.0) {
    let p_idx = instance_index;
    let particle = particles_storage[p_idx];
    pos_phys = particle.pos + (local_coord - 0.5) * particle.size;
    // ...
}
```

- [ ] **Step 2: Commit**

```bash
git add shaders/render.wgsl
git commit -m "feat: add particle rendering pass to render.wgsl"
```

### Task 4: Scene Compiler Integration

**Files:**
- Modify: `src/compiler/scene_compiler.rs`

- [ ] **Step 1: Update `NarrativeScene` and `SubShotVisuals`**

Add `ParticleConfig` to the schema.

```rust
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ParticleConfig {
    pub density: Option<u32>,
    pub speed: Option<f32>,
    pub turbulence: Option<f32>,
    pub theme: Option<String>,
}
```

- [ ] **Step 2: Pass particle data to `FrameData`**

Update `compile_frame` to return particle simulation parameters.

- [ ] **Step 3: Commit**

```bash
git add src/compiler/scene_compiler.rs
git commit -m "feat: integrate particle config into SceneCompiler"
```

### Task 5: Final Orchestration and Testing

**Files:**
- Modify: `src/bin/render_native.rs`

- [ ] **Step 1: Update `render_native` to dispatch particle compute pass**

Ensure `renderer.render_frame_with_particles(...)` is called every frame.

- [ ] **Step 2: Run a 12-minute stress test**

Run: `cargo run --bin render_native -- --duration 720 --fps 60`

- [ ] **Step 3: Commit**

```bash
git add src/bin/render_native.rs
git commit -m "feat: complete end-to-end particle system integration"
```
