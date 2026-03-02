# AIM — Animated Background Implementation Guide

## Overview
Integrate the "Living Neural Intelligence" animated background into the AIM landing page hero section. The background shows floating health metrics (FTP, HRV, Sleep Score, etc.) as glowing nodes connected by neural pathways, with shooting star synapse effects and a heartbeat pulse rhythm. All CSS-animated, no Canvas.

## Source File
`bg-demo-6b-neural-css.jsx` contains the complete working animation as a standalone React component.

## Integration Steps

### 1. Extract the Background Component
Create `src/components/NeuralBackground.jsx` from the demo file. Strip out the hero text and demo labels — this component should ONLY render the animated background layer (particles, dots, connections, shooting stars, scan line, vignette).

The component should accept no props and render as a full-viewport absolute-positioned layer.

### 2. Integrate into Landing Page Hero
In the landing page hero section, wrap the existing hero content and the NeuralBackground together:

```jsx
<section style={{ position: "relative", overflow: "hidden" }}>
  <NeuralBackground />
  {/* Existing hero content sits on top with z-index */}
  <div style={{ position: "relative", zIndex: 10 }}>
    {/* ... hero headline, subtext, CTAs ... */}
  </div>
</section>
```

### 3. Buffer Zone
The background component already avoids placing nodes in the center 50% × 40% of the viewport so text remains readable. If the hero text layout changes, adjust the `isInCenter` function in the component:

```js
// Current buffer: x 25-75%, y 30-70%
const isInCenter = (x, y) => x > 25 && x < 75 && y > 30 && y < 70;
```

Adjust these percentages to match wherever the hero text sits.

### 4. Performance Considerations
- The animation uses CSS transforms and opacity only (GPU-accelerated, no layout thrashing)
- 38 data nodes + 100 ambient dots + 24 shooting stars + ~60 SVG connection lines
- All animations use `will-change: transform, opacity` implicitly via CSS animations
- Consider adding `will-change: transform` explicitly to particle containers if needed
- On mobile, reduce particle count (e.g., 20 nodes, 50 ambient, 12 stars) for performance

### 5. Responsive Adjustments
- The component uses percentage-based positioning (0-100%) so it scales to any viewport
- Shooting star paths use `window.innerWidth/innerHeight` — these should be recalculated on resize, or converted to percentage-based CSS
- On mobile (< 768px), consider:
  - Hiding data labels (show dots only)
  - Reducing particle count by 50%
  - Reducing drift range to avoid overflow
  - Making the buffer zone larger (center 60% × 50%)

### 6. Color Tokens
The background uses these colors that should match the global theme:

```js
const ACCENT = "#00e5a0";  // Green — power/achievement metrics
const BLUE = "#3b82f6";    // Blue — recovery/sleep metrics  
const PURPLE = "#a078ff";  // Purple — health/blood work metrics
const TEAL = "#00c8b4";    // Teal — training status metrics
const BG = "#05060a";      // Page background
```

### 7. Data Labels
The floating metric labels are defined in the `dataLabels` array. These should stay in sync with what AIM actually tracks. Current labels include:

**Power:** FTP 298W, 4.2 W/kg, VO₂max 58, Threshold ↑12W, Sprint 1180W, NP 287W, FTP ↑14W, 5min PR ↑, Cadence 92rpm

**Recovery:** Deep Sleep 1h22m, HRV 68ms, Recovery 92%, RHR 47bpm, Sleep Score 88, HR 142bpm, HRV ↑12ms, REM 1h48m, Readiness 94, Bed Temp 67°F

**Health:** Lean Mass +1.2kg, Ferritin 52, Vitamin D 58, Iron ✓, B12 680, Hemoglobin 14.2, SpO₂ 98%, Cortisol Normal, Hydration 94%

**Training:** Fitness ↑, Form +8, Fatigue Low, CTL 74, Ready to Train, TSS 82, Training Load ↑, Efficiency 3.82

### 8. Animation Scope
The background should ONLY appear on the landing page hero section, not on the dashboard, auth pages, or other internal pages. It's a marketing element, not a UI pattern.

### 9. Key CSS Animations Reference

| Animation | Purpose | Duration |
|-----------|---------|----------|
| `drift` | Nodes floating around in organic paths | 18-43s per node |
| `breathe` | Nodes pulsing opacity (heartbeat feel) | 3-7s per node |
| `heartbeat` | Connection lines pulsing brighter together | 3-6s |
| `shootingStar` | Glowing orb traveling between points | 1.5-4s, looping every 3-11s |
| `pulseRing` | Expanding ring from nodes | 4-9s |
| `scanLine` | Subtle green sweep across screen | 12s |

### 10. File Structure After Integration

```
src/
  components/
    NeuralBackground.jsx    ← extracted from demo
    ui/
      ...
  pages/
    Landing.jsx             ← imports NeuralBackground
    ...
```
