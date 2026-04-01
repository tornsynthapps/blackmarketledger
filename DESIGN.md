# **Design System: “Hardline Interface”**

*A sharp-edged, industrial, high-contrast UI language for cross-application consistency*

---

## 1. Concept Overview

**Core Idea:**
A brutally precise, engineered interface that feels *manufactured*, not decorated.

**Design DNA:**

* Sharp 90° geometry (no rounded corners)
* Dense, opaque surfaces
* Strong typographic hierarchy
* Mechanical interaction feedback
* High contrast, deliberate color blocking

**Emotional Tone:**

* Authoritative
* Technical
* Intentional
* Slightly intimidating (in a good way)

**Memorable Trait:**

> Every element looks like it was cut from metal or printed on a terminal—nothing feels soft or accidental.

---

## 2. Design Principles

### 2.1 Geometry First

* No border-radius (strictly `0px`)
* Rectangular dominance
* Hard edges and grid alignment

### 2.2 Opaque Layers

* No glassmorphism, blur, or translucency
* Use stacked panels with solid fills
* Depth is created via **offset shadows**, not opacity

### 2.3 Typographic Authority

* Typography replaces decoration
* Large, bold labels
* Monospace + grotesque pairing

### 2.4 Visible Structure

* Borders are explicit (1–2px lines)
* Layout grids are *felt*, not hidden
* Sections are boxed, framed, or segmented

### 2.5 Motion as Mechanics

* No easing curves that feel “soft”
* Use:

  * `cubic-bezier(0.2, 0, 0, 1)` (snappy)
  * Linear transitions
* Animations feel like toggles, not fluid morphs

---

## 3. Visual Language

### 3.1 Color System

**Base Palette:**

```css
--color-bg: #0B0B0C;
--color-surface: #141416;
--color-elevated: #1C1C1F;

--color-primary: #F2F2F2;
--color-secondary: #A1A1A6;
--color-muted: #6B6B70;
```

**Accent Colors (used strategically):**

```css
--color-accent-red: #FF3B30;
--color-accent-yellow: #FFD60A;
--color-accent-blue: #0A84FF;
--color-accent-green: #32D74B;
```

**Updated Rules (Website Context):**

* ~80% grayscale, ~20% controlled color
* One accent color per section
* No gradients
* Color used for hierarchy, not decoration

---

### 3.2 Typography

**Font Pairing Strategy:**

* **Display / Headers:** Industrial grotesque or neo-brutalist
* **Body / UI / Data:** Monospace

---

### 3.3 Spacing System

Strict modular spacing

---

### 3.4 Borders & Dividers

Explicit, consistent

---

### 3.5 Shadows (Minimal, Hard)

Offset only

---

## 4. Component System

### 4.1 Buttons

**Style:**

* Rectangular
* Thick borders
* High contrast

```css
.button {
  background: #F2F2F2;
  color: #000;
  border: 2px solid #000;
  padding: 12px 16px;
  text-transform: uppercase;
}
```

**States:**

* Hover: invert colors
* Active: shift position (simulate press)
* Disabled: desaturated gray

---

### 4.2 Inputs

**Design:**

* Terminal-like
* Monospace font
* No rounded edges

```css
.input {
  background: #0B0B0C;
  border: 1px solid #3A3A3F;
  color: #F2F2F2;
  padding: 10px;
}
```

**Focus State:**

* Bright border (accent color)
* No glow

---

### 4.3 Cards / Panels

**Structure:**

* Hard containers
* Clear segmentation

```css
.card {
  background: #141416;
  border: 1px solid #2A2A2E;
  padding: 16px;
}
```

**Variants:**

* Elevated (thicker border)
* Highlight (accent stripe on top)

---

### 4.4 Navigation

**Top Bar:**

* Fixed height
* Heavy bottom border
* Left-aligned logo, right-aligned controls

**Sidebar:**

* Narrow, dense
* Vertical labels
* Active item = solid fill + border

---

### 4.5 Tables

**Design Philosophy:**

* Data-first, zero fluff

Features:

* Monospace
* Row separators
* No zebra striping
* Hover = subtle background shift

---

## 5. Layout System

### Compact Layout Directive

* Reduce vertical whitespace
* Prefer dense layouts
* Avoid oversized padding

---

## 6. Motion & Interaction

### 6.1 Animation Principles

* Fast (100–180ms)
* No bounce
* No elastic effects

### 6.2 Examples

**Button Press:**

```css
transform: translate(2px, 2px);
```

**Panel Reveal:**

* Fade + slight upward motion
* Staggered entry

**Hover:**

* Color inversion
* Border emphasis

---

## 7. Iconography

**Updated:**

* Use **Hugeicons** exclusively
* Maintain consistent stroke weight
* No mixing icon libraries

---

## 8. Accessibility

* High contrast ratios (WCAG AA+)
* Focus states always visible
* Keyboard navigation emphasized
* Avoid relying on color alone for meaning

---

## 9. Theming Strategy

Two core modes:

### Dark (Primary)

* Default experience
* Industrial feel

### Light (Optional)

* White background
* Black borders
* Same structure, inverted palette

---

## 10. Implementation Guidelines

### Tech Stack Agnostic

Works with:

* React / Next.js
* Vue
* Plain HTML/CSS

### CSS Strategy

* Use CSS variables for tokens
* Prefer utility + component hybrid approach
* Avoid heavy UI libraries (maintain uniqueness)

---

## 11. What to Avoid (Strict)

* ❌ Rounded corners
* ❌ Soft gradients
* ❌ Glassmorphism / blur
* ❌ Playful animations
* ❌ Overuse of color
* ❌ Generic SaaS layouts

---

## 12. Example Use Cases

This system works especially well for:

* Developer tools
* Admin dashboards
* Financial systems
* Data-heavy applications
* Internal tools

---

## 13. Website-Level Rules

### Professional Quality

* Must look like a senior designer built it
* No inconsistencies
* No arbitrary decisions

### Coherence

* Same components everywhere
* Same spacing rhythm
* Same interaction behavior

### Compactness

* Dense sections
* Efficient layout

---

## 14. Final Directive

> The website should be **colorful but minimal, compact, highly structured, and unmistakably professional**, with strict coherence across every page.

---

**End of Document**
