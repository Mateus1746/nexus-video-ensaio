# Particle Morphing Phase 3: Data Visualizations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable particles to morph into data visualizations (Bar Charts, Trend Lines) where the particles themselves form the chart elements.

**Architecture:**
- **Sampling**: Create a utility to generate target points within the rectangles of a Bar Chart or along the path of a Trend Line.
- **Integration**: Link existing chart configuration data to the particle target system.
- **Control**: Add `chart_morph: bool` to `ParticleConfig` in `narrative.json`.

---

### Task 1: Implement Chart Point Sampler

**Files:**
- Create: `src/compiler/chart_sampler.rs`
- Modify: `src/compiler/mod.rs`

- [ ] **Step 1: Create `src/compiler/chart_sampler.rs`**

Implement functions to sample points within shapes:
- `sample_points_in_rect(x, y, w, h, count) -> Vec<[f32; 2]>`
- `sample_points_on_line(x1, y1, x2, y2, count) -> Vec<[f32; 2]>`

Implement `sample_from_bar_chart(config: &BarChartConfig, count: usize) -> Vec<[f32; 2]>`:
- Distribute `count` particles across the bars proportional to their area.

- [ ] **Step 2: Commit**

```bash
git add src/compiler/chart_sampler.rs src/compiler/mod.rs
git commit -m "feat: add chart point sampling utility"
```

### Task 2: Scene Compiler Integration (The Chart Morph)

**Files:**
- Modify: `src/compiler/scene_compiler.rs`
- Modify: `src/compiler/text_label.rs`

- [ ] **Step 1: Update `ParticleConfig`**

```rust
pub struct ParticleConfig {
    // ...
    pub morph_to_chart: Option<bool>,
}
```

- [ ] **Step 2: Logic to link charts to particles**

In `compile_frame`, if `morph_to_chart` is true:
1. Check if a `bar_chart` or `trend_line` is active in the current visuals.
2. Use `chart_sampler` to generate targets based on that chart's geometry.
3. Update `particle_targets`.

- [ ] **Step 3: Commit**

```bash
git add src/compiler/scene_compiler.rs src/compiler/text_label.rs
git commit -m "feat: enable data chart morphing for particles"
```

### Task 3: Final Verification and Stress Test

- [ ] **Step 1: Run 12-minute render with all morph types**

Create a `narrative.json` that cycles through:
- Organic Flow
- World Map
- Dollar Icon
- Military Spending Bar Chart

- [ ] **Step 2: Commit**
