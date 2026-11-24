# AutoLux UX Contract — Phase 1

## Business context
Three divisions: vehicle rentals, vehicle sales and automotive products. They share identity, customers, payments and administration foundations, but keep separate inventory and transaction lifecycles.

## Phase 1 routes
- `/` public brand landing page
- `/vehicles` future vehicle discovery placeholder
- `/shop` future automotive products placeholder
- `/services` public services overview
- `/contact` contact placeholder
- `*` branded not-found page

## Navigation and accessibility
Use native links for navigation, semantic buttons for actions, visible keyboard focus, skip-to-content link and a single page-level H1. Mobile navigation exposes `aria-expanded`.

## Motion ownership
GSAP: hero and scroll reveal orchestration. Framer Motion: React transitions. Lenis: smooth scrolling. Respect `prefers-reduced-motion`.

## Data and security
Phase 1 pages use editorial content only and collect no customer personal data. Secrets never enter source control. Readiness checks database connectivity without exposing credentials.

## Deferred workflows
Authentication and Super Admin bootstrap: Phase 2. Catalogs: Phase 3. Fleet and bookings: Phase 4. Vehicle sales, product checkout and payments: Phase 5. Production scaling: Phase 6.
