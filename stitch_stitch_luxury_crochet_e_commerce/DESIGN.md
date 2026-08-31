---
name: Stitch Design System
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#45464f'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#757680'
  outline-variant: '#c5c6d0'
  surface-tint: '#4c5d8d'
  primary: '#00061f'
  on-primary: '#ffffff'
  primary-container: '#081d4a'
  on-primary-container: '#7586b9'
  inverse-primary: '#b4c5fc'
  secondary: '#3b6377'
  on-secondary: '#ffffff'
  secondary-container: '#bde6fc'
  on-secondary-container: '#40687b'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cca730'
  on-tertiary-container: '#4f3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b4c5fc'
  on-primary-fixed: '#031846'
  on-primary-fixed-variant: '#344573'
  secondary-fixed: '#c0e8ff'
  secondary-fixed-dim: '#a4cce3'
  on-secondary-fixed: '#001e2b'
  on-secondary-fixed-variant: '#224b5e'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
  charcoal-text: '#1D1D1F'
  glass-fill: rgba(255, 255, 255, 0.6)
  stroke-soft: rgba(0, 0, 0, 0.05)
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  ui-label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  tech-data:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 20px
  container-max: 1440px
---

## Brand & Style

The design system embodies "Handmade Precision." It bridges the tactile, organic nature of crochet with the clinical, high-tech minimalism of modern consumer electronics. The target audience seeks exclusivity, appreciating both the time-intensive craft of handmade goods and the frictionless experience of premium digital platforms.

The aesthetic is defined as **Tactile Glassmorphism**. It utilizes heavy white space and a rigid structural grid (inspired by Apple) but disrupts it with playful, tech-retro details like monospaced accents and dot-matrix patterns (inspired by Nothing). The emotional response should be one of "Warm Sophistication"—feeling both cutting-edge and deeply human.

## Colors

The palette centers on **Deep Navy Blue** for authority and luxury, contrasted against **Warm White** to prevent the interface from feeling cold. **Gold** is used sparingly as a "hallmark" color—reserved for high-value interactions, luxury tier indicators, and primary call-to-actions.

Glass components use a high-translucency white fill with a significant background blur. This creates a sense of physical depth, mimicking a studio lens or a glass display case. Dark Charcoal is the exclusive color for legibility, ensuring high contrast against the soft background palette.

## Typography

Typography is a dialogue between tradition and technology. **Playfair Display** provides the editorial, high-fashion voice for headings. **Inter** handles the functional heavy lifting, providing maximum readability for product descriptions.

A third typeface, **Space Grotesk** (serving as a refined alternative to tech-retro monospaces), is used for "technical" data: SKU numbers, material compositions, and price labels. This creates a "spec-sheet" aesthetic that elevates the perceived engineering of the crochet patterns.

## Layout & Spacing

The layout uses a **12-column Fixed Grid** for desktop and a **4-column Fluid Grid** for mobile. Borrowing from the "Pinterest-style," product galleries should use a masonry reflow where card heights vary based on the aspect ratio of the knit texture photography.

Spacing follows an 8px linear scale. Large components and sections should be separated by "Stitched" dividers—a custom 1px dashed border style that mimics a running stitch. Whitespace is used aggressively to isolate products, treating each item like a gallery piece.

## Elevation & Depth

Depth is achieved through **Optical Stacking**. Layers are defined by their blur intensity rather than heavy shadows.

- **Level 0 (Background):** Warm White with subtle grain texture.
- **Level 1 (Cards):** Frosted glass panels with a 1px white inner-border and a 20% opacity drop shadow (Blur: 30px, Y: 10px).
- **Level 2 (Navigation):** Floating glass bar with maximum blur (20px) and a high-contrast 1px border in Primary Navy.

When a user hovers over a product card, it should "lift" by decreasing the blur of the shadow and increasing the scale by 2%, creating a tactile response.

## Shapes

The design system uses a generous **24px (1.5rem)** corner radius for all major containers and product cards to mimic the soft, looped nature of yarn. 

Secondary elements like buttons and input fields use a **Pill-shape (999px)**. This roundness contrast distinguishes interactive elements from structural containers. Icons should follow a 2pt stroke weight with rounded caps and joins to maintain the visual thread.

## Components

### Floating Navigation
A centered, pill-shaped glass bar. The active state is indicated by a Primary Navy dot below the label. The "Cart" icon features a gold badge with a dot-matrix number display.

### Product Cards
Cards feature edge-to-edge photography with a 12px padding "inner glass" shelf at the bottom for the product name and price. Prices are set in the tech-data font style.

### Buttons
- **Primary:** Solid Deep Navy with Gold text.
- **Secondary:** Frosted glass with Deep Navy text and a 1px Navy border.
- **Interaction:** On hover, the 'Yarn Ball' cursor interaction should show a slight "unraveling" animation trail.

### Stitched Dividers
Horizontal rules are not solid lines; they are 1px dashes (4px dash, 4px gap) in Primary Navy at 20% opacity, creating a literal "stitched" seam between content blocks.

### Input Fields
Minimalist underlines with the label positioned in the tech-data style above the line. Upon focus, the line transforms from a light gray dash to a solid Primary Navy line.