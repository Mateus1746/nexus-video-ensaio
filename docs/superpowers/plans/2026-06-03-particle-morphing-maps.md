# Particle Morphing Phase 1: Geographical Maps

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable particles to morph into geographical shapes (country borders/fills) based on GeoJSON data.

**Architecture:**
- **Data**: Update `Particle` struct with `target_pos` and `mode`.
- **Sampling**: Add a utility to sample random points within GeoJSON polygons or along their borders.
- **Physics**: Update `particles.wgsl` to interpolate between flow-field movement and target attraction.
- **Control**: Add `target_map` and `morph_strength` to `ParticleConfig` in `narrative.json`.

---

### Task 1: Update Particle Core for Morphing

**Files:**
- Modify: `src/rasterizer.rs`
- Modify: `shaders/particles.wgsl`
- Modify: `shaders/render.wgsl`

- [ ] **Step 1: Expand Particle and SimParams structs in Rust**

Update `src/rasterizer.rs`. Ensure 16-byte alignment (use 48 or 64 bytes).

```rust
#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Particle {
    pub pos: [f32; 2],
    pub vel: [f32; 2],
    pub target: [f32; 2], // New: Morph target
    pub life: f32,
    pub size: f32,
    pub color_idx: f32,
    pub influence: f32,   // New: 0.0 = flow, 1.0 = target
    pub _pad1: f32,
    pub _pad2: f32,
}
```

Update `SimParams`:
```rust
pub struct SimParams {
    // ... existing ...
    pub morph_strength: f32,
    pub _pad: f32,
}
```

- [ ] **Step 2: Update WGSL Shaders**

Update `Particle` struct in `particles.wgsl` and `render.wgsl` to match.

- [ ] **Step 3: Update `simulate_particles` in Rust**

Pass `morph_strength` from config to the GPU.

- [ ] **Step 4: Commit**

```bash
git add src/rasterizer.rs shaders/particles.wgsl shaders/render.wgsl
git commit -m "feat: infrastructure for particle morphing"
```

### Task 2: Implement GeoJSON Point Sampler

**Files:**
- Create: `src/compiler/geo_sampler.rs`
- Modify: `src/compiler/mod.rs`

- [ ] **Step 1: Create `src/compiler/geo_sampler.rs`**

Implement a function `sample_points_from_geojson(path, count, viewport)` that returns a `Vec<[f32; 2]>`. Use the existing `mercator_project` logic from `point_map.rs`.

- [ ] **Step 2: Commit**

```bash
git add src/compiler/geo_sampler.rs
git commit -m "feat: add GeoJSON point sampling utility"
```

### Task 3: Morph Physics in Compute Shader

**Files:**
- Modify: `shaders/particles.wgsl`

- [ ] **Step 1: Implement Lerp logic**

In `main`, if `p.influence > 0.0`, calculate a vector towards `p.target` and apply it to `p.vel`.

```wgsl
    // Morph Attraction
    let to_target = p.target - p.pos;
    let dist = length(to_target);
    if (dist > 0.1) {
        let morph_acc = normalize(to_target) * params.morph_strength * 2.0;
        p.vel = mix(p.vel, morph_acc, params.morph_strength);
    }
```

- [ ] **Step 2: Commit**

```bash
git add shaders/particles.wgsl
git commit -m "feat: implement morph attraction in compute shader"
```

### Task 4: Scene Compiler Integration (The Map Trigger)

**Files:**
- Modify: `src/compiler/scene_compiler.rs`
- Modify: `src/compiler/text_label.rs`

- [ ] **Step 1: Update `ParticleConfig`**

```rust
pub struct ParticleConfig {
    // ...
    pub target_map: Option<String>, // e.g. "world", "usa"
    pub morph_strength: Option<f32>,
}
```

- [ ] **Step 2: Logic to update Particle Targets**

In `compile_frame`, if `target_map` changed, trigger a re-sampling and upload new `target` positions to the `particle_buffer`. 

*Note: This requires a new method in `HeadlessRenderer` to update only the `target` field of existing particles.*

- [ ] **Step 3: Commit**

```bash
git add src/compiler/scene_compiler.rs src/compiler/text_label.rs
git commit -m "feat: bridge narrative maps to particle morphing"
```
