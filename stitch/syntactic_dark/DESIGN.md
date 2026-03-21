# Design System Specification: The Syntactic Architect

## 1. Overview & Creative North Star
**Creative North Star: The Syntactic Architect**
This design system moves beyond the generic "SaaS dashboard" aesthetic to create a high-density, editorial environment tailored for the modern developer. It treats code and prompts not just as data, but as the primary subject of a digital gallery. By combining the precision of a professional IDE with the sophisticated layout of high-end technical journals, we create an experience that feels both hyper-functional and premium.

We break the "template" look through **Intentional Asymmetry**—where sidebar widths and content blocks are weighted to drive focus—and **Tonal Depth**, replacing antiquated 1px borders with sophisticated background layering.

## 2. Colors & Surface Architecture
The palette is rooted in "Developer Dark"—a range of deep slates and cool grays that reduce eye strain during long sessions, punctuated by "Electric Blue" (`primary`) for high-intent actions.

### The "No-Line" Rule
Standard UI relies on borders to separate sections. In this system, **1px solid borders for sectioning are prohibited.** Boundaries must be defined solely through background color shifts. 
- Use `surface` for the main application background.
- Use `surface_container_low` for secondary navigation or sidebars.
- Use `surface_container_highest` to highlight active editor zones.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. To create depth, "nest" containers using the surface tiers:
1.  **Level 0 (Base):** `surface` (#0b1326)
2.  **Level 1 (Sections):** `surface_container_low` (#131b2e)
3.  **Level 2 (Interactive Cards):** `surface_container` (#171f33)
4.  **Level 3 (Focus Elements):** `surface_container_high` (#222a3d)

### The "Glass & Gradient" Rule
To elevate the technical feel, floating elements (Modals, Command Palettes) must use **Glassmorphism**. Apply `surface_container_highest` at 80% opacity with a `20px` backdrop blur. 
- **Signature Texture:** Primary CTAs should not be flat. Apply a subtle linear gradient from `primary` (#a7c8ff) to `primary_container` (#3291ff) at a 135-degree angle to provide a "lithic" glow.

## 3. Typography
Our typography strategy pairs the structural authority of a display face with the mathematical precision of monospace.

*   **Display & Headlines (`Space Grotesk`):** Used for high-level branding and section headers. Its geometric quirks provide the "Editorial" soul.
*   **UI Labels & Navigation (`Inter`):** The workhorse. Used for all functional UI elements to ensure maximum readability at small sizes.
*   **Prompt & Code Content (`Monospace`):** Use JetBrains Mono or Fira Code for all prompt inputs and outputs. This distinguishes "Instruction" from "Interface."

**The Hierarchy Rule:** Use `display-sm` for page titles to create a high-contrast anchor, while keeping `label-md` for technical metadata to maintain high information density.

## 4. Elevation & Depth
Depth in this system is an atmospheric quality, not a structural one.

*   **Tonal Layering:** Achieve "lift" by stacking surface tiers. For example, a `surface_container_lowest` card placed on a `surface_container_low` section creates a natural, soft inset look without a single shadow.
*   **Ambient Shadows:** For floating elements like dropdowns, use an extra-diffused shadow: `offset: 0 8px, blur: 40px, color: #060e20` (40% opacity). The shadow must be a tinted version of the background to mimic natural ambient light.
*   **The "Ghost Border" Fallback:** If a container lacks sufficient contrast (e.g., in a data-dense table), use a **Ghost Border**. This is the `outline_variant` token (#414754) at **15% opacity**. Never use 100% opaque borders.

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` text, `rounded-sm`. 
*   **Secondary:** Ghost style. No background, `outline_variant` ghost border, `primary` text.
*   **Tertiary:** `surface_container_highest` background, no border, `on_surface` text.

### Prompt Editor (The Core Component)
*   **Container:** `surface_container_low`. 
*   **Header:** `surface_container` with `title-sm` typography. 
*   **Content Area:** JetBrains Mono, `body-md`. 
*   **Interaction:** No internal dividers. Use `spacing-6` (1.3rem) to separate prompt blocks from response blocks.

### Chips & Tags
*   Use `secondary_container` (#3a4a5f) for backgrounds.
*   Shape: `rounded-sm` (0.125rem) to maintain the "technical/sharp" aesthetic.
*   Typography: `label-sm`.

### Input Fields
*   **Base:** `surface_container_lowest` (#060e20).
*   **Focus State:** A 1px "Ghost Border" using `primary` at 40% opacity. 
*   **Error State:** Use `error` (#ffb4ab) for the label text and a subtle `error_container` glow.

### Cards & Lists
*   **Strict Rule:** No divider lines. Separate items using a background shift to `surface_container` on hover, or use `spacing-4` (0.9rem) of vertical whitespace.

## 6. Do's and Don'ts

### Do
*   **Do** use `spacing-1` and `spacing-2` for tight, technical groupings of metadata.
*   **Do** leverage asymmetry; if a sidebar is narrow, let the main content area breathe with wider margins.
*   **Do** use `tertiary` (#ffb695) sparingly for "Warning" or "Experimental" AI features to break the blue/gray monotony.

### Don't
*   **Don't** use `rounded-full` for anything other than status indicators. We favor the precision of `rounded-sm`.
*   **Don't** use pure black (#000000). Always use the `surface` tokens to maintain the "Developer Dark" tonal range.
*   **Don't** use standard "Drop Shadows" for depth. Stick to tonal layering and ambient, tinted glows.
*   **Don't** use Inter for code. Always switch to the monospace stack for prompt logic.