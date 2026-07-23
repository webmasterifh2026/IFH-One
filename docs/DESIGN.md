# Purpose
Documents the IFH One Design System (IFH Green Enterprise), establishing the visual language and frontend UI constraints for the platform.

# Scope
Applies to the `apps/web` frontend and `packages/ui` component library.

# Last Generated
2026-06-29

# Related Documents
- [PROJECT.md](./PROJECT.md)
- [CONVENTIONS.md](./CONVENTIONS.md)

---

## Design Philosophy
IFH One is engineered to be an **enterprise-grade, professional, and data-driven** platform. 
- **Information Density:** High density to allow fast scanning of large datasets without feeling cluttered.
- **Workflow Visibility:** Procurement stages must be immediately decipherable.
- **Trustworthiness:** A robust, grounded visual weight (achieved through standard Inter typography and structured grids).

## Theme Architecture
The official theme is **IFH Green Enterprise**.
- **Location:** The overarching tokens exist in `apps/web/src/app/globals.css`.
- **Methodology:** We utilize Tailwind v4's inline `@theme` native CSS variable mapping. This completely deprecates `tailwind.config.ts` complexity, delegating theme control solely to native browser CSS inheritance.

## Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#0F7B45` | Main actions, primary buttons, highlighted text |
| `--primary-hover` | `#0B6237` | Hover state for primary buttons |
| `--primary-light` | `#E8F6EE` | Accent backgrounds, soft highlights |
| `--sidebar-bg` | `#0A4D2E` | Left vertical navigation bar |
| `--sidebar-hover` | `#126A3F` | Sidebar interactive item hover state |
| `--sidebar-active-pill`| `#E8F6EE` | Sidebar active state container |
| `--app-background`| `#F8FAF9` | Underlying application canvas |
| `--card-background`| `#FFFFFF` | Core container for widgets, forms, tables |
| `--secondary-surface`| `#F3F4F6` | Inner card groupings, inactive areas |
| `--border` | `#E5E7EB` | Dividers, table borders, input outlines |

### Status Colors
- **Success:** `#16A34A`
- **Warning:** `#F59E0B`
- **Danger:** `#DC2626`
- **Info:** `#2563EB`
- **Draft:** `#9CA3AF`
- **In Progress:** `#3B82F6`
- **Pending Approval:** `#F97316`
- **Approved:** `#22C55E`
- **Rejected:** `#EF4444`
- **On Hold:** `#EAB308`
- **Archived:** `#64748B`

## Typography System
**Font Family:** `Inter` (sans-serif)

| Style | Size | Weight |
|-------|------|--------|
| **Page Title** | 32px | 700 (Bold) |
| **Section Title** | 24px | 600 (Semibold) |
| **Card Title** | 18px | 600 (Semibold) |
| **Table Header** | 14px | 600 (Semibold) |
| **Body** | 14px | 400 (Regular) |
| **Small Text** | 12px | 400 (Regular) |
| **KPI Numbers** | 32px | 700 (Bold) |

## Layout Standards
The layout relies on a strict **4px Base Grid**.
- **Spacing Scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
- **Border Radius:** `sm` (8px), `md` (12px), `lg` (16px), `xl` (20px)
- **Shadows:** Avoid excessive layering. Use `--shadow-card` (very subtle) for cards, `--shadow-hover` (medium) for interactions, and `--shadow-dialog` (strong) for modals.

### Global Structure
```text
Sidebar (280px / 80px collapsed)
  |-- Header (72px height)
  |-- Page Title
  |-- Filters
  |-- KPI Cards
  |-- Charts / Tables / Activity Feed
```
Content Padding is standard at **24px**. Max content width is **fluid** to adapt to large enterprise monitors.

## Component Standards
- **Buttons:** 8px radius. Primary buttons are solid `--primary`. Secondary buttons are outlined with `--border`.
- **Inputs & Selects:** 8px radius. 14px text. `focus-visible:ring-2 focus-visible:ring-primary`.
- **Tables:** Sticky headers. Row hover state (`bg-secondary-surface`). Compact spacing (py-2 px-4 cells) for data density.
- **Forms:** Single column for < 5 inputs. Two columns for large dataset inputs. Required fields marked natively via ShadCN form states.

## ShadCN Integration Recommendations
- Initialize ShadCN UI using the `new-york` style as it naturally aligns with the denser, smaller text requirements of enterprise tools compared to the `default` style.
- Customize the `radius` mapping in `components.json` to 0.5rem (8px) out of the gate.
- Map ShadCN utility classes (`bg-background`, `text-foreground`, `ring-ring`) directly to the newly defined IFH tokens to ensure zero impedance mismatch between the design system and out-of-the-box ShadCN components.
- Override ShadCN standard `Card` components to use the `--shadow-card` (subtle) utility instead of hard borders where applicable.

## Dark Mode Strategy
Dark Mode is primed but dormant. 
- The architecture is mapped inside `@media (prefers-color-scheme: dark)` in `globals.css` using inverted surface colors (Gray 900 canvas, Gray 800 cards).
- Primary greens are shifted slightly lighter (`#10B981`) to maintain WCAG contrast ratios against dark backgrounds.
