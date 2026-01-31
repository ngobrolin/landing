# Light/Dark Mode Design Refresh

**Date:** 2026-01-31
**Status:** Design Approved
**Goal:** Refresh Ngobrolin WEB with bold, expressive design supporting light and dark modes

---

## Overview

Transform the existing dark-only site into a themeable experience with:
- **Bold & Expressive** aesthetic emphasizing gradients, glassmorphism, and dynamic effects
- **Inverted color scheme** between light and dark modes
- **System preference** detection with manual override
- **Floating navigation** with integrated theme toggle
- Client-side theme switching with CSS variables

---

## Color System

### Dark Mode Colors (Refined Current)

```css
/* Backgrounds */
--bg-primary: #0f172a    /* Deep slate - main background */
--bg-surface: rgba(30, 41, 59, 0.6)   /* Glass cards */
--bg-nav: rgba(15, 23, 42, 0.85)      /* Floating nav */

/* Brand */
--brand-primary: #ec4899     /* Pink */
--brand-secondary: #8b5cf6   /* Purple */
--brand-accent: #22d3ee      /* Cyan */

/* Status */
--status-fresh: #34d399
--status-hot: #fb923c
--status-season: #eab308

/* Text */
--text-heading: #ffffff
--text-body: #e2e8f0
--text-muted: #94a3b8

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1)
```

### Light Mode Colors (Inverted)

```css
/* Backgrounds */
--bg-primary: #f8fafc    /* Light slate */
--bg-surface: rgba(255, 255, 255, 0.7)   /* White glass */
--bg-nav: rgba(255, 255, 255, 0.85)      /* White floating nav */

/* Brand - Inverted positions */
--brand-primary: #8b5cf6     /* Purple (was secondary) */
--brand-secondary: #ec4899   /* Pink (was primary) */
--brand-accent: #0891b2      /* Darker cyan for contrast */

/* Status - Slightly adjusted for light backgrounds */
--status-fresh: #10b981
--status-hot: #f97316
--status-season: #ca8a04

/* Text */
--text-heading: #0f172a
--text-body: #334155
--text-muted: #64748b

/* Borders */
--border-subtle: rgba(0, 0, 0, 0.1)
```

### Gradients (Both Modes)

- **Brand gradient:** `linear-gradient(to top right, var(--brand-primary), var(--brand-secondary))`
- **Hero text:** `linear-gradient(to right, var(--brand-primary), var(--brand-secondary), var(--brand-accent))`
- **Background glows:** Three radial gradients with reduced opacity in light mode (0.15 vs 0.4)

---

## Navigation & Theme Toggle

### Floating Navigation Bar

Per style.json spec, navigation floats with glassmorphism:

```css
.nav-floating {
  position: sticky;
  top: 1rem;
  margin: 0 1rem;
  max-width: calc(100% - 2rem);
  border-radius: 9999px;
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  background: var(--bg-nav);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: all 300ms ease;
}

/* Scroll state: shrinks slightly */
.nav-scrolled {
  top: 0.5rem;
  padding: 0.5rem 1rem;
}
```

### Theme Toggle Button

- **Position:** Right side of nav, between "Tentang" and "Langganan"
- **Size:** 40px circular button
- **Icons:** Animated sun/moon with smooth transition

```css
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-subtle);
  transition: all 300ms ease;
}

.theme-toggle:hover {
  box-shadow: 0 0 20px var(--brand-primary-alpha);
  transform: rotate(15deg);
}
```

### JavaScript Implementation

Inline script in `<head>` to prevent flash of wrong theme:

```javascript
const theme = localStorage.getItem('theme') ||
             (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.classList.toggle('dark', theme === 'dark');
```

Toggle click handler updates class and stores preference.

---

## Typography & Hero Section

### Typography System

- **Primary font:** Outfit (500, 600, 700 weights)
- **Import:** Google Fonts with display-swap
- **Tailwind v4:** Configured via `@theme` directive

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&display=swap');

@theme {
  --font-family-sans: 'Outfit', system-ui, sans-serif;
}
```

### Hero Section

**Layout:**
- `min-h-[70vh]` with flex center
- Animated background glow orbs (three positioned radially)
- Gradient text effect on title

**Gradient Text:**
```css
.hero-title {
  background: linear-gradient(to right,
    var(--brand-primary),
    var(--brand-secondary),
    var(--brand-accent)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

**Background Glows:**
```css
.hero-bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;  /* 0.15 in light mode */
  pointer-events: none;
}

/* Positioned at: */
/* Top-left: var(--brand-primary) */
/* Top-right: var(--brand-secondary) */
/* Bottom-center: var(--brand-accent) */
```

**CTAs:**
- Primary: Brand gradient background, white text (dark mode) / dark text (light mode)
- Ghost: Semi-transparent bg with border

---

## Cards & Components

### Episode Cards

Per style.json with enhanced glassmorphism:

```css
.card {
  border-radius: 32px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px -10px var(--brand-primary-alpha);
}
```

**Card Structure:**
- Thumbnail: Aspect-video with `group-hover:scale-105` transition
- Episode badge: Bottom-left, semi-transparent bg
- "BARU" badge: Top-left, uses `--status-fresh`
- Date: `--text-muted`, small
- Title: `--text-heading`, truncate-2, hover: `--brand-primary`
- Description: `--text-body`, truncate-2

### Status Badges

Use style.json colors for episode indicators:
- **Fresh:** New episodes (green)
- **Hot:** Trending episodes (orange)
- **Season:** Season finale/premiere (yellow)

### Buttons

**Primary Button:**
```css
.btn-primary {
  background: linear-gradient(to top right,
    var(--brand-primary),
    var(--brand-secondary)
  );
  border-radius: 9999px;
  font-weight: 600;
  color: white;  /* or dark in light mode */
}
```

**Ghost Button:**
```css
.btn-ghost {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: 9999px;
  color: var(--text-heading);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

---

## Animations & Transitions

1. **Page transitions:** Fade + subtle scale (300ms ease-in-out)
2. **Card hover:** Lift 8px + brand color glow
3. **Nav scroll:** Shrink from 60px to 50px height
4. **Theme toggle:** 180° rotation + icon fade (300ms)
5. **Stagger animations:** Cards fade in sequentially (100ms delay each)

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fade-in-up 300ms ease-out backwards;
}
```

---

## Mobile Responsiveness

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Nav | Full width, floating | Full width, floating | Full width, floating |
| Hero glows | 600px | 400px | 300px |
| Card grid | 4 columns | 2 columns | 1 column |
| Mobile menu | Hidden | Hidden | Full-screen overlay |
| Theme toggle | In nav | In nav | In nav |

**Mobile Menu:**
- Full-screen overlay with blur backdrop
- Matches current theme
- Smooth slide-in animation

---

## Implementation Files

1. **`src/styles/global.css`** - CSS variables, theme utilities, base styles
2. **`src/layouts/Layout.astro`** - Theme script, floating nav, theme toggle
3. **`src/components/ThemeToggle.astro`** - **NEW** reusable toggle component
4. **`src/components/EpisodeCard.astro`** - Updated card styling
5. **`src/pages/index.astro`** - Enhanced hero with glows/gradients
6. **`src/pages/*.astro`** - Update all pages for theme consistency

---

## CSS Variables Architecture

```css
@layer base {
  :root {
    /* Light mode defaults */
    --bg-primary: #f8fafc;
    --bg-surface: rgba(255, 255, 255, 0.7);
    --bg-nav: rgba(255, 255, 255, 0.85);
    --brand-primary: #8b5cf6;
    --brand-secondary: #ec4899;
    --brand-accent: #0891b2;
    --text-heading: #0f172a;
    --text-body: #334155;
    --text-muted: #64748b;
    --border-subtle: rgba(0, 0, 0, 0.1);
  }

  .dark {
    /* Dark mode overrides */
    --bg-primary: #0f172a;
    --bg-surface: rgba(30, 41, 59, 0.6);
    --bg-nav: rgba(15, 23, 42, 0.85);
    --brand-primary: #ec4899;
    --brand-secondary: #8b5cf6;
    --brand-accent: #22d3ee;
    --text-heading: #ffffff;
    --text-body: #e2e8f0;
    --text-muted: #94a3b8;
    --border-subtle: rgba(255, 255, 255, 0.1);
  }

  html {
    @apply bg-[var(--bg-primary)] text-[var(--text-body)];
  }
}
```

---

## Success Criteria

- [ ] Theme toggle switches between light/dark modes instantly
- [ ] System preference is detected on first visit
- [ ] Theme preference persists across sessions (localStorage)
- [ ] No flash of wrong theme on page load
- [ ] All components work in both light and dark modes
- [ ] Floating nav with blur effect visible on scroll
- [ ] Hero gradient text and glow orbs animate smoothly
- [ ] Cards have hover lift and glow effects
- [ ] Mobile menu respects current theme
- [ ] E2E tests pass for theme switching functionality
