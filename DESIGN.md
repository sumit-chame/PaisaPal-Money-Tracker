# Pocket Design System — CodeNova Brand Restyle

> Brand restyle extracted from **https://www.codenovatechsolutions.in** (CodeNova Tech Solutions).
> Replaced AI-generated aesthetic (rainbow gradients, glows, blur, emoji) with solid, structured engineering design.

---

## 1. Extracted Brand Values (Step A)

### Typography
- **Body & Headings (`--font-sans`, `--font-display`):**
  `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Monospace (`--font-mono`):**
  `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`
- **Weights:** Strictly 400 (Regular) and 600 (Semibold). Amounts in tabular numerals (`font-variant-numeric: tabular-nums`).

### Logo Colors (`/Img/codenova_tech_solutions_logo.jpg`)
- **Brand Teal / Emerald:** `#00BFA6`
- **Tech Navy:** `#1F3B6F`
- **Dark Cube Slate:** `#030213`

### Corner Radius
- `--radius-sm`: `6px` (chips, compact buttons)
- `--radius-md`: `8px` (inputs, buttons, list rows)
- `--radius-lg`: `16px` (cards, dialogs, sheets)

---

## 2. Core Tokens (`src/styles/tokens.css`)

| Variable | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--bg` | `#F4F6F8` | `#0A0F1D` | Page background |
| `--surface` | `#FFFFFF` | `#131A2A` | Card & bar surface |
| `--surface-2` | `#ECEEF2` | `#1D283E` | Inputs, raised surfaces |
| `--border` | `#E2E8F0` | `#25334E` | 1px borders |
| `--text` | `#222222` | `#F8FAFC` | Primary typography |
| `--text-muted` | `#555555` | `#94A3B8` | Subtext, timestamps |
| `--primary` | `#1F3B6F` | `#00BFA6` | Primary action & brand accent |
| `--primary-contrast` | `#FFFFFF` | `#0A0F1D` | Text on primary |
| `--income` | `#00BFA6` | `#00BFA6` | Income / positive amounts |
| `--expense` | `#FF7A59` | `#FF7A59` | Expense / negative amounts |
| `--transfer` | `#1F3B6F` | `#60A5FA` | Transfer amounts |
| `--radius-sm` | `6px` | `6px` | Small elements |
| `--radius-md` | `8px` | `8px` | Standard controls |
| `--radius-lg` | `16px` | `16px` | Large cards & containers |

---

## 3. Brand Category Palette (12 Swatches)

Curated around the CodeNova brand colors rather than random rainbow hues:

1. **Tech Navy:** `#1F3B6F`
2. **Brand Teal:** `#00BFA6`
3. **Coral Orange:** `#FF7A59`
4. **Cobalt Blue:** `#2563EB`
5. **Dark Teal:** `#0D9488`
6. **Forest Green:** `#16A34A`
7. **Amber Gold:** `#D97706`
8. **Crimson Red:** `#D4183D`
9. **Indigo:** `#4F46E5`
10. **Steel Blue:** `#7A9CBF`
11. **Slate Gray:** `#475569`
12. **Deep Slate:** `#334155`

---

## 4. Design Rules & Guardrails

- **Solid Colors Only:** No gradients on buttons, cards, text or backgrounds.
- **No Glow / Glassmorphism:** Clean 1px solid borders; sheets use subtle 0 4px 16px shadow.
- **No Emojis:** Replaced with crisp Lucide icons (stroke width 1.75px).
- **Plain, Direct Copy:** "Add expense", "Safe today", "Recent".
- **Grid:** 8px base spacing grid.
