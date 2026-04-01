# ⚡ Animation System & Cinematic Transitions

**Purpose**: Comprehensive guide to animations, transitions, and cinematic effects in the Ice-Truck dashboard

**Version**: Phase 20
**Target Performance**: 60 FPS with <5ms frame overhead

---

## 🎬 Overview

The animation system is built on three core pillars:

1. **Framer Motion** - React component animations and layout transitions
2. **Tailwind Animations** - CSS-based keyframe animations
3. **Imperative Transforms** - Direct DOM manipulation for high-frequency updates (telemetry)

---

## 🎯 Animation Categories

### 1. Entry/Exit Animations

#### Fade + Slide

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
  Content
</motion.div>
```

**Use Cases**:

- Page transitions
- Modal appearances
- Panel reveals

**Performance**: Low (~2ms per frame)

#### Scale + Fade

```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: 'cubicBezier(0.34, 1.56, 0.64, 1)' }}
>
  Popping element
</motion.div>
```

**Trigger**: Component mount
**Performance**: Minimal with GPU acceleration

### 2. Hover Animations

#### Scale on Hover

```jsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
>
  Interactive element
</motion.div>
```

**Parameters**:

- `damping: 20-30` - Controls spring oscillation
- `stiffness: 200-400` - Speed of spring response
- Mass: Implicit (for touch feedback)

#### Glow on Hover

```css
.glass-panel {
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-panel:hover {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}
```

### 3. Layout Animations

#### Shared Layout Animations

```jsx
<AnimatePresence>
  <motion.div
    key={activeId}
    layoutId={`panel-${activeId}`}
    layout
    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
  >
    Dynamic content
  </motion.div>
</AnimatePresence>
```

**Benefits**:

- Automatic positional transitions
- Simultaneous size changes
- No manual keyframe management

**Performance Cost**: ~5ms for complex layouts

### 4. Continuous Animations

#### Shimmer Effect

**CSS Implementation** (in `globals.css`):

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 3s linear infinite;
  background: linear-gradient(
    120deg,
    transparent,
    rgba(255, 255, 255, 0.15),
    transparent
  );
  background-size: 200% 100%;
}
```

**Activation**:

```jsx
<div className='opacity-0 group-hover:opacity-100 animate-shimmer'>
  Appears on hover
</div>
```

**Duration**: 3 seconds (one full cycle)
**Performance**: <1ms when not visible (GPU-optimized)

#### Pulsing Glow

**Definition**:

```css
@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.animate-glow-pulse {
  animation: glow-pulse 2.5s ease-in-out infinite;
}
```

**Use Case**: Highlighting active elements
**Example**: Status indicators, live data badges

#### Border Glow

```css
@keyframes glass-border-glow {
  0% {
    box-shadow:
      0 0 5px rgba(139, 92, 246, 0.3),
      0 0 10px rgba(34, 211, 238, 0.2);
  }
  50% {
    box-shadow:
      0 0 15px rgba(139, 92, 246, 0.5),
      0 0 20px rgba(34, 211, 238, 0.4);
  }
  100% {
    box-shadow:
      0 0 5px rgba(139, 92, 246, 0.3),
      0 0 10px rgba(34, 211, 238, 0.2);
  }
}
```

**Cycle Time**: 3 seconds
**Intensity Variation**: 0.3x → 0.5x opacity

### 5. High-Frequency Animations

#### Telemetry Updates (Imperative)

**Pattern**: Direct DOM manipulation for 60 FPS updates

```typescript
// In telemetry engine (Web Worker)
const updateTelemetryFrame = () => {
  // Update via useRef, NOT React state
  truckMarkerRef.current.position = [lat, lng]
  truckMarkerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

// 60 FPS update loop
requestAnimationFrame(updateTelemetryFrame)
```

**Rationale**:

- React re-renders would cause jank (30+ ms lag)
- Direct transforms are GPU-accelerated
- No state reconciliation overhead

**Performance**: <3ms per frame for 100+ elements

---

## 🎨 Easing Functions

### Predefined Easing Curves

| Name            | Formula        | Best For            | Duration         |
| --------------- | -------------- | ------------------- | ---------------- |
| **spring**      | Physics-based  | Snappy interactions | Auto (200-400ms) |
| **easeOut**     | Cubic B-spline | Page transitions    | 300-600ms        |
| **cubicBezier** | Custom curve   | Custom feel         | Variable         |
| **linear**      | No easing      | Continuous motion   | 2-10s            |
| **easeInOut**   | S-curve        | Modal transitions   | 200-500ms        |

### Custom Bezier Curves

```jsx
// Bouncy spring-like
easeOut: [0.34, 1.56, 0.64, 1]

// Smooth deceleration
easeOut: [0.25, 0.46, 0.45, 0.94]

// Snappy entrance
easeOut: [0.6, 0.04, 0.98, 0.33]
```

### Visual Reference

```
     easeOut (snappy)          spring-like (bouncy)
        ╱‾‾╲╲                   ╱‾‾╲╲
       ╱    ╲ ╲                ╱    ╲ ╲╲
      ╱      ╲ ╲              ╱      ╲ ╲╲╲
     ╱        ╲ ╲            ╱        ╲ ╲╲╲╲
    0          1            0           1.5    1
```

---

## 🔄 Transition Types

### Spring Transition

```jsx
transition={{
  type: 'spring',
  damping: 25,        // 0-100 (higher = less bounce)
  stiffness: 200,     // 0-500 (higher = faster)
  mass: 1,            // Weight of element
}}
```

**Characteristics**:

- Natural physics-based motion
- Slight overshoot/bounce
- Ideal for interactive elements
- Adaptive to user interaction

**Recommended Settings**:

- **Snappy**: `damping: 20, stiffness: 350`
- **Soft**: `damping: 35, stiffness: 150`
- **Bouncy**: `damping: 15, stiffness: 250`

### Tween Transition

```jsx
transition={{
  type: 'tween',
  duration: 0.5,
  ease: 'easeOut',
}}
```

**Characteristics**:

- Linear keyframe-style animation
- Predictable timing
- Ideal for automated sequences
- Lower CPU overhead than spring

**Use Cases**:

- Page transitions
- Loading states
- Choreographed animations

---

## 📊 Animation Timing Table

| Animation       | Duration      | Trigger      | Performance |
| --------------- | ------------- | ------------ | ----------- |
| Shimmer         | 3s infinite   | hover        | <1ms        |
| Glow pulse      | 2.5s infinite | always       | <2ms        |
| Card scale      | 200ms         | hover        | <1ms        |
| Page transition | 400ms         | route change | <3ms        |
| Tilt effect     | instant       | mousemove    | <5ms        |
| Modal enter     | 300ms         | modal open   | <3ms        |
| Collapse/expand | 250ms         | toggle       | <4ms        |

---

## 🎯 Performance Optimization Techniques

### 1. GPU Acceleration

**Use `transform` and `opacity`**:

```jsx
// ❌ Poor performance (triggers layout)
animate={{ marginLeft: 100 }}

// ✅ Excellent performance (GPU accelerated)
animate={{ x: 100 }}
```

**Which properties are GPU-accelerated**:

- `transform` (translate, rotate, scale, skew)
- `opacity`
- `filter`

**Which trigger layout recalculation**:

- ❌ width, height, margin, padding
- ❌ left, right, top, bottom
- ❌ font-size, line-height

### 2. Will-Change Declaration

```jsx
<div className='will-change-transform'>{/* Will be animated */}</div>
```

**Effect**: Browser pre-allocates GPU layer
**Cost**: ~500KB VRAM per element (with caution!)

### 3. Lazy Animation Initialization

```jsx
// Only animate on hover
<div className='opacity-0 group-hover:opacity-100'>
  {/* Shimmer starts when visible */}
</div>
```

### 4. Debounced Event Handlers

```jsx
// Throttle mousemove to 60 FPS (16ms...)
const onMouseMove = throttle(e => {
  updateTilt(e)
}, 16)
```

---

## 🧪 Testing Animations

### Visual Testing (Playwright)

```bash
pnpm test:visual
```

**Captures**:

- Hover states
- Animation progress frames
- End states

### Performance Profiling

```bash
# In Chrome DevTools Performance tab:
1. Record animation
2. Check FPS in graphs
3. Look for main thread bottlenecks
```

**Good metrics**:

- FPS stays at 60
- Main thread drops <16ms
- GPU utilization increases (not CPU)

### Unit Testing Animation Logic

```typescript
it('should animate from 0 to 1', async () => {
  const { getByTestId } = render(<GlassCard />)
  const card = getByTestId('glass-card')

  // Assume opacity starts at 0
  expect(card).toHaveStyle('opacity: 0')

  // After hover
  fireEvent.mouseEnter(card)
  await waitFor(() => {
    expect(card).toHaveStyle('opacity: 1')
  }, { timeout: 500 })
})
```

---

## 🚨 Common Animation Pitfalls

### 1. Animating Non-Accelerated Properties

```jsx
// ❌ Jank!
animate={{ width: 300 }}

// ✅ Smooth
animate={{ scale: 1.5 }}  // instead of width change
```

### 2. Too Many Simultaneous Animations

```jsx
// ❌ 100+ cards all animating = jank
{
  cards.map(card => <motion.div animate={{ x: card.x }} />)
}

// ✅ Stagger animations
{
  cards.map((card, i) => (
    <motion.div animate={{ x: card.x }} transition={{ delay: i * 0.02 }} />
  ))
}
```

### 3. Infinite Animations Always Running

```jsx
// ❌ Continuous 60 FPS update even when invisible
;<motion.div animate={{ rotate: 360 }} />

// ✅ Only run when visible
{
  isVisible && <motion.div animate={{ rotate: 360 }} />
}
```

### 4. Blocking Main Thread

```jsx
// ❌ Heavy computation in animation frame
onAnimationFrame(() => {
  const result = heavyComputation() // Blocks!
})

// ✅ Use Web Worker
worker.postMessage(data)
worker.onmessage = result => {
  animate(result)
}
```

---

## 📈 Animation Playlist

Pre-built animation combinations:

### "Fade In & Lift"

```jsx
const fadeInLift = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
}

<motion.div {...fadeInLift}>Content</motion.div>
```

### "Scale Pop"

```jsx
const scalePop = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: {
    type: 'spring',
    damping: 20,
    stiffness: 300
  },
}

<motion.div {...scalePop}>Content</motion.div>
```

### "Slide From Left"

```jsx
const slideFromLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
}

<motion.div {...slideFromLeft}>Content</motion.div>
```

### "Shimmer Reveal"

```jsx
const shimmerReveal = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6 },
}

<motion.div {...shimmerReveal}>
  <div className="animate-shimmer">Content</div>
</motion.div>
```

---

## 🔧 Configuration Reference

### Global Animation Config

```typescript
// framer-motion.config.ts (global defaults)
export const defaultTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 200,
}
```

### Per-Component Overrides

```jsx
<motion.div
  transition={{
    ...defaultTransition,
    duration: 1, // Override
  }}
>
  Content
</motion.div>
```

---

## 🎬 Advanced: Orchestrating Complex Sequences

### Staggered Children

```jsx
<motion.div>
  {children.map((child, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 0.1 }}
    >
      {child}
    </motion.div>
  ))}
</motion.div>
```

### Coordinated Parent-Child Animation

```jsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  <motion.div
    initial={{ x: -100 }}
    animate={{ x: 0 }}
    transition={{ delay: 0.3 }}
  >
    Animates after parent
  </motion.div>
</motion.div>
```

---

## 📚 References

- **Framer Motion Docs**: https://www.framer.com/motion/
- **MDN Animation Guide**: https://developer.mozilla.org/en-US/docs/Web/CSS/animation
- **Cubic Bezier Visualizer**: https://cubic-bezier.com/
- **60 FPS Performance**: https://web.dev/animations-guide/

---

**Last Section**: Run `pnpm test:visual` to see all animations in action!
