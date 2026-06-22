# Particle Morphing Phase 2: Iconic Shapes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable particles to morph into iconic shapes (logos, symbols, silhouettes) based on image files.

**Architecture:**
- **Sampling**: Create a utility to sample coordinates from the non-transparent pixels of a PNG/PNG icon.
- **Integration**: Reuse the `targets_buffer` infrastructure from Phase 1.
- **Control**: Add `target_icon` to `ParticleConfig` in `narrative.json`.

---

### Task 1: Implement Image Point Sampler

**Files:**
- Create: `src/compiler/icon_sampler.rs`
- Modify: `src/compiler/mod.rs`

- [ ] **Step 1: Create `src/compiler/icon_sampler.rs`**

Implement `sample_points_from_image(path: &str, count: usize, vw: f32, vh: f32) -> Vec<[f32; 2]>`.
Use the `image` crate (already in project) to find pixels with alpha > 128.

- [ ] **Step 2: Commit**

```bash
git add src/compiler/icon_sampler.rs src/compiler/mod.rs
git commit -m "feat: add image icon point sampling utility"
```

### Task 2: Scene Compiler Integration (The Icon Trigger)

**Files:**
- Modify: `src/compiler/scene_compiler.rs`
- Modify: `src/compiler/text_label.rs`

- [ ] **Step 1: Update `ParticleConfig`**

```rust
pub struct ParticleConfig {
    // ...
    pub target_icon: Option<String>, // e.g. "usa_flag", "dollar_sign"
}
```

- [ ] **Step 2: Logic to handle icons**

In `compile_frame`, if `target_icon` is present, use `sample_points_from_image` to generate targets.

- [ ] **Step 3: Commit**

```bash
git add src/compiler/scene_compiler.rs src/compiler/text_label.rs
git commit -m "feat: enable icon morphing in narrative compiler"
```

### Task 3: Visual Verification

- [ ] **Step 1: Run test render with icon**

Create a simple narrative with `target_icon: "test_assets/dollar.png"`.

- [ ] **Step 2: Commit**
