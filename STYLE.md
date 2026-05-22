# Matcha By Kamo UI Style Guide

Use this as the design and copy reference when starting a new project.

## Brand Essence

- Brand name: Matcha By Kamo
- Mood: zen, minimalist, warm, intentional
- Personality: quiet confidence, calm minimalism, Japanese-inspired simplicity
- Voice: concise, lowercase-forward UI labels, warm but restrained
- **Note**: This is a refined matcha café brand, not a loud matcha-themed establishment. The aesthetic is sophisticated minimalism with subtle warm accents.

## Visual Direction

- Embrace **Japanese minimalism**: generous whitespace, subtle details, restrained palette
- Use soft, warm neutrals as foundation—avoid stark whites
- Introduce warmth through carefully placed warm accents (not matcha green everywhere)
- Keep the accent green (#2f5d50) **subtle and restrained**—use it sparingly for focus/active states
- Prefer **suggestion over statement**: thin lines, soft shadows, quiet confidence
- Design should feel like entering a serene, intentional space

## Core Color Tokens

```css
:root {
  /* Soft warm-stone neutrals—the foundation */
  --surface: #e3e1dc;         /* Limewash gray base */
  --surface-strong: #d7d4ce;  /* Slightly deeper stone gray */
  --surface-deep: #c9c5be;    /* Header/footer supporting gray */
  --card: rgba(226, 224, 218, 0.9);
  --card-strong: #dbd8d2;
  
  /* Typography & structure */
  --ink: #1a1a1a;            /* Deep, warm black */
  --ink-soft: #666056;       /* Warm gray for secondary text */
  --line: rgba(26, 26, 26, 0.08); /* Very subtle dividers */
  
  /* Accent—subtle, grounded green (not matcha-forward) */
  --accent: #2f5d50;         /* Restrained depth green */
  --accent-soft: #e8eeeb;    /* Barely-there accent tint */
  
  /* Warmth accent—use very sparingly */
  --warm: #c8a97e;           /* Soft tea/wood warmth */
}
```

**Philosophy**: The green is intentional but never loud. It appears on active states and focus areas, suggesting rather than shouting.

## Typography

- Display font: Outfit
- Body font: Inter
- Body tracking: slightly tight (`-0.01em`)
- Nav and microcopy: small, lowercase, light emphasis
- Headings: elegant, controlled scale, avoid oversized hero text unless image-led

## Background and Atmosphere

Use layered background treatment instead of plain color.

```css
body {
  background:
    radial-gradient(circle at 15% 12%, rgba(255, 255, 255, 0.28), transparent 34%),
    radial-gradient(circle at 84% 20%, rgba(255, 255, 255, 0.18), transparent 40%),
    radial-gradient(circle at 24% 76%, rgba(185, 178, 168, 0.16), transparent 46%),
    linear-gradient(180deg, #ebe9e4 0%, var(--surface) 50%, #d8d4ce 100%);
  color: var(--ink);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 2px, rgba(201, 195, 184, 0.018) 2px, rgba(201, 195, 184, 0.018) 8px),
    repeating-linear-gradient(20deg, rgba(161, 154, 144, 0.014) 0, rgba(161, 154, 144, 0.014) 3px, transparent 3px, transparent 11px);
  mix-blend-mode: multiply;
  opacity: 0.48;
}
```

Header/Footer tone rule:
- Keep header and footer one step darker than `--surface` using warm-gray values around `#cdc8c1` to `#bbb6ae`.
- Avoid charcoal shifts; stay in warm stone territory for a premium, calm finish.

## Layout System

- Max content width: around 90rem
- Horizontal padding:
  - Mobile: 1rem
  - Tablet: 1.5rem
  - Desktop: 2.5rem
- Prefer generous vertical whitespace
- Keep sections airy and balanced

Example shell:

```css
.brand-shell {
  width: 100%;
  max-width: 90rem;
  margin-inline: auto;
  padding-inline: 1rem;
}
@media (min-width: 640px) { .brand-shell { padding-inline: 1.5rem; } }
@media (min-width: 1024px) { .brand-shell { padding-inline: 2.5rem; } }
```

## Signature Components

### Header/Nav

- Clean, light card background with soft overflow
- **Dual logo header**: emoji icon + text brand name (both clickable to home)
- **Subtle divider**: thin (0.5px), 80% width centered, barely-visible line with warm glow
- Lowercase nav labels with refined spacing
- **Active state**: soft shadow + background tint (NOT underline)—suggests focus quietly
- Icons: minimal line-weight, purposefully restrained
- **Philosophy**: Navigation should feel like a quiet guide, not a prominent frame

### Typography Hierarchy

- Display: Outfit font, controlled sizes, narrow tracking
- Body: Inter font, tight spacing (-0.01em), warm-gray default
- Nav/Microcopy: extra small, lowercase, light emphasis
- All links: subtle color shift on hover, never loud

### Shadows & Depth

- Use **soft, diffused shadows** for active states and depth
- Never hard-edged borders—prefer 0.5px lines or soft shadows
- Shadows should feel like morning light, not overcast drama
- Active nav items: subtle shadow + tinted background (e.g., `box-shadow: 0 4px 8px rgba(47, 93, 80, 0.12)`)

### Cards and Panels

- Soft white/near-white background
- Hairline borders (0.5px) in soft gray
- Diffused, low-contrast shadow
- Rounded corners: 4-6px (not exaggerated)
- Generous internal padding

## Motion Principles

- Keep motion **invisible**—it should feel natural, never announce itself
- Transitions: 150ms duration, ease timing
- Favor opacity, color shift, and soft shadow changes
- **Avoid**: scale transforms, vibrant color changes, sliding entrances
- Hover states should feel like a light touch, not a grab
- Example: nav item active state = background tint + shadow, no line appearance

## Visual Language: Minimalist Japanese Aesthetic

This is **not** a matcha bar theme—it's a refined café experience using Japanese design principles:

- **Ma (negative space)**: Embrace emptiness. Whitespace is intentional, never wasted.
- **Wabi-sabi (imperfect beauty)**: Subtle imperfections and soft edges create warmth.
- **Yohaku no bi (incompleteness)**: Suggestion over statement. Let the user's imagination fill the gaps.
- **Seijaku (tranquility)**: Color, motion, and layout should feel calm and deliberate.

**Color application**:
- Warm neutrals = primary (soft creams, warm grays)
- Green accent = minimal (active states, focus, subtle highlights only)
- Warm accent = rare (special moments, invitations)
- **Rule**: If you count the accent colors in a design, there are too many.

## Copy Style

- Use concise, intentional language
- UI labels: always lowercase
- Tone: sophisticated, not cutesy—this is a refined establishment
- Avoid hype, sales language, or casual tone
- Preferred voice examples:
  - "carefully selected"
  - "slow crafted"
  - "simple and thoughtful"
  - "a moment of calm"
- Never overexplain—let brevity suggest elegance

## Experience Rules

- Menu should feel **curated**, like a gallery walk—not a DIY builder
- Category-first browsing (by origin, preparation, season)
- **Whitespace is generous**—crowding kills the zen
- Visual rhythm should feel **intentional**—every element earns its place
- **No decorative clutter**—every detail serves a purpose
- Navigation should feel like a quiet suggestion, never a command
- Active states: soft suggestions (shadows, tints) rather than harsh indicators
- This is a place of **intention and respect for the user's time**

## Quick Start Checklist For New Projects

- Set global color tokens and typography first
- Build sticky header + brand shell layout
- Apply atmospheric background treatment
- Create card/button primitives before feature pages
- Enforce lowercase nav/microcopy style
- Use category-first product browsing patterns
- Add subtle shadows/borders; avoid loud visual noise

## Prompt Snippet (For AI Design/Code Tools)

Use this snippet when asking another tool/model to generate UI:

"Create a clean, premium cafe web UI for Matcha By Kamo. Use warm neutral surfaces, deep ink typography, and a restrained green accent. Keep labels mostly lowercase, spacing generous, and interactions subtle. Style should feel intentional, calm, and modern-minimal. Menu must be catalog-style grouped by business categories. Avoid loud colors, playful gimmicks, and cluttered layouts."

## Quick Start Checklist For New Projects

- ✅ Set global color tokens—emphasize warm neutrals, minimal accent use
- ✅ Build sticky header with dual-logo, thin centered divider (80% width)
- ✅ Apply atmospheric background (warm gradient)
- ✅ Create minimalist nav with shadow-based active states (NO underlines)
- ✅ Enforce lowercase UI labels and restrained tone
- ✅ Use category-first organization for complex content
- ✅ Add generous whitespace—less is always more
- ✅ Replace underlines with soft shadows for active/focus states
- ✅ Use 150ms transitions with ease timing
- ✅ Make every color choice deliberate—if you see too much accent, reduce it

## Design Principles Checklist

Before shipping any interface:

1. **Remove one color.** Is everything still clear? That was extra.
2. **Check the silence.** Does whitespace feel generous and intentional?
3. **Test active states.** Are shadows soft enough? No harsh outlines.
4. **Scan accent use.** Should only be 3–5 accent accents on a page. If more, desaturate.
5. **Read the copy.** Is it concise and lowercase? Can you remove a word?
6. **Verify motion.** Do transitions feel invisible? No jankiness?
7. **Final pass.** Does the design feel like a calm, intentional space?

## Prompt Snippet (For AI Design/Code Tools)

"Create a refined, minimalist café web UI for Matcha By Kamo using Japanese design principles. Use warm cream neutrals (#f7f5f2), deep warm ink (#1a1a1a), and restrain the accent green (#2f5d50) to active/focus states only. 

Design should feel: serene, intentional, sophisticated—NOT matcha-themed or playful. Navigation has a thin (0.5px) centered divider at 80% width, dual logo header, and active states use soft shadows + tinted backgrounds (never underlines). 

Typography: lowercase UI labels, generous whitespace, 150ms ease transitions. Every detail should suggest rather than shout. This is a space of calm and respect."
