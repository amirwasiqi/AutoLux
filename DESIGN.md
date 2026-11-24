---
version: alpha
name: "AutoLux"
description: "A cinematic luxury automotive brand experience with a disciplined, high-trust commerce and operations interface."
colors:
  ink: "#050607"
  carbon: "#101214"
  graphite: "#1A1D20"
  gold: "#D8B45A"
  goldLight: "#F0D58B"
  paper: "#F4F1E9"
  muted: "#A6A6A2"
  line: "#303235"
  success: "#5DAA83"
  danger: "#D66C65"
typography:
  display:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
  sans:
    fontFamily: "'DM Sans', Arial, sans-serif"
  mono:
    fontFamily: "'IBM Plex Mono', monospace"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.875rem"
spacing:
  page-max: "88rem"
  section-gap: "7rem"
components:
  button: { height: "3.25rem", radius: "0.25rem" }
  card: { radius: "0.5rem", border: "1px solid #303235" }
---
# AutoLux Design System

## Overview
### Creative North Star
A private performance-car atelier after dark: blackened architectural surfaces, precision details, warm brushed gold and one dramatic automotive image treated like a gallery object. It must not resemble a generic dealership template or gaming dashboard.

### Product context and register
- **Audience:** US customers comparing premium rentals, vehicles for sale and automotive products.
- **Market:** United States initially.
- **Locales:** English default; German, French and Arabic planned. Arabic requires true RTL support.
- **Register:** Hybrid. Public pages are expressive; customer and admin workflows prioritize clarity.
- **Signature:** A narrow gold light-path motif used as a hero accent and section divider.
- **Restraint:** Forms, prices and operational screens remain calm and predictable.
- **Anti-references:** Neon gaming UI, generic SaaS gradients, cluttered listings and excessive glassmorphism.
- **Token mapping:** This file is the visual contract. Runtime tokens live in `frontend/src/styles/tokens.css` and map to MUI in `frontend/src/theme/theme.js` and Tailwind in `frontend/tailwind.config.js`.

## Colors
Near-black ink and carbon are architectural surfaces. Gold is reserved for actions and emphasis. Paper white is primary text; muted gray is secondary. Success and danger remain semantic.

## Typography
Barlow Condensed gives headlines a motorsport character. DM Sans handles body copy and controls. IBM Plex Mono is for metadata and numeric labels. Future Arabic typography requires a dedicated Arabic-capable font and suitable line-height.

## Layout
Use an editorial grid with an 88rem maximum width. Marketing pages are spacious and image-led. Tablet and mobile layouts collapse without horizontal overflow.

## Elevation & Depth
Prefer tonal layers, hairline borders and controlled image lighting over heavy shadows.

## Shapes
Use restrained small-to-medium radii. Avoid pill-shaped controls except compact tags. Gold rules and fine dividers create rhythm.

## Components
### Foundational states
Interactive controls need hover, visible keyboard focus, pressed, disabled and busy states. Loading must not change button dimensions.
### Buttons and actions
Primary actions use gold fill and dark text. Secondary actions use transparent carbon and a visible border.
### Navigation and data display
Marketing navigation is minimal and editorial. Future product navigation is task-oriented and keyboard accessible.
### Forms and overlays
Use explicit labels, inline validation and app-owned dialogs.
### Iconography
Use MUI icons with consistent stroke weight. Icon-only controls require accessible names.
### Motion
GSAP owns orchestrated hero/scroll sequences, Framer Motion owns React transitions, and Lenis owns smooth scrolling. Respect reduced-motion preferences and never delay essential content.
### Content and data visualization
Copy is direct and specific. Prices and specifications use aligned numerals and clear units.

## Do's and Don'ts
- **Do:** Use dramatic but readable automotive imagery.
- **Do:** Keep gold accents rare enough to feel intentional.
- **Don't:** Delay navigation or booking with motion.
- **Don't:** sacrifice contrast, keyboard access or mobile usability for atmosphere.
