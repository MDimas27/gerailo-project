---
name: Ringkas Operasional UMKM
colors:
  surface: '#FFFFFF'
  surface-dim: '#d1dbe9'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e4effd'
  surface-container-high: '#dfe9f7'
  surface-container-highest: '#d9e3f1'
  on-surface: '#121c26'
  on-surface-variant: '#3e4947'
  inverse-surface: '#27313c'
  inverse-on-surface: '#e8f2ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#3b665f'
  on-secondary: '#ffffff'
  secondary-container: '#bdece2'
  on-secondary-container: '#416c65'
  tertiary: '#7f4025'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c573a'
  on-tertiary-container: '#ffe5db'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#bdece2'
  secondary-fixed-dim: '#a2d0c6'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#224e47'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb598'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#72361b'
  background: '#F7F8FA'
  on-background: '#121c26'
  surface-variant: '#d9e3f1'
  text-secondary: '#667085'
  border: '#E6E9ED'
  status-success: '#15803D'
  status-warning: '#D97706'
  status-danger: '#DC2626'
  status-info: '#2563EB'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  currency-body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system is constructed for fast-paced, micro-to-small enterprise (UMKM) owners managing commerce through conversational channels like WhatsApp. The aesthetic sits at the intersection of **Modern Corporate** reliability and **Utilitarian Utility**—purposefully stripped of financial intimidation while maintaining operational rigor.

### Personality & Emotional Response
- **Pragmatic & Reassuring:** Interfaces feel calm and orderly, reducing the friction of logging sales, checking stock, or following up on payments during peak business hours.
- **Approachable Confidence:** Visual elements avoid complex bookkeeping jargon in favor of natural conversational Indonesian idioms (e.g., "Uang Masuk", "Catat Pengeluaran", "Simpan Pesanan").
- **Speed & Tactility:** Targets are generous and feedback is instantaneous, designed for one-handed operation on mobile devices while multitasking.

## Colors

The palette pairs a stabilizing dark teal (`#0F766E`) with a soft mint tint (`#CCFBF1`) to reinforce operational stability without the coldness of corporate blue.

### Roles and Application
- **Primary (`#0F766E`):** Used for primary conversion touchpoints, active states, key data highlights, and prominent callouts like "Tambah Pesanan / Smart Paste".
- **Primary Soft (`#CCFBF1`):** Serves as an interactive wash, active tab indicators, chip backdrops, and subtle highlighting for parsed WhatsApp text.
- **Surface (`#FFFFFF`) & Background (`#F7F8FA`):** Provides a clean, two-layer surface hierarchy. Content sits in distinct white cards over the cool neutral canvas.
- **Text Primary (`#17212B`) & Secondary (`#667085`):** Text levels prioritize contrast. Primary text guarantees quick scanning for customer names and rupiah totals; secondary handles metadata like timestamps and SKU counts.
- **Semantic Accents:** 
  - `status-success` (`#15803D`): Confirmed orders, full payments ("Lunas"), adequate stock.
  - `status-warning` (`#D97706`): Pending down-payments ("DP"), unpaid balances, low stock alerts.
  - `status-danger` (`#DC2626`): Canceled transactions, failed verifications, stock-out warnings.
  - `status-info` (`#2563EB`): Text parsing suggestions, automation status, neutral system alerts.

## Typography

The design system relies exclusively on **Inter** for its neutral legibility and robust tabular number rendering.

### Numbers & Financial Figures
- All currency readouts (IDR / Rp), item quantities, and stock counts must enable tabular figures (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`). This prevents visual jumpiness in order lists and summary ledgers.
- Nominal amounts use heavy weights (`600` or `700`) to enable immediate identification when glancing across order records.

### Microcopy Guidelines
- Use conversational, active verbs:
  - Prefer "Catat Pengeluaran" over "Pencatatan Beban/Biaya".
  - Prefer "Uang Masuk" over "Penerimaan Kas / Pendapatan".
  - Prefer "Tagih Pelanggan" over "Kirim Invoice".
  - Prefer "Simpan Pesanan" over "Submit Formulir".

## Layout & Spacing

The system is engineered **mobile-first**, optimized for single-hand interaction on a baseline viewport of 390px (compact modern smartphone standard).

### Grid & Form Factors
- **Mobile (≤ 640px):** Single-column fluid view with `margin: 1rem` (16px) and `gutter: 1rem`. Content stays within thumb-friendly zones, reserving the bottom 80px for persistent navigation and main action triggers.
- **Tablet (641px - 1024px):** 6-column fluid structure with centered container maxing out at 680px for focused transaction screens, or 2-column split (list on left, detail on right) with 16px gutters.
- **Desktop (≥ 1025px):** 12-column layout maxing out at 1200px container width, with `margin-desktop: 2rem`. Sidebar handles navigation while main canvas holds summary tables.

### Structural Rhythm
- Spacing relies on a clean 4px/8px modular base.
- Internal component padding uses `space-md` (12px) or `space-lg` (16px).
- Vertical stack spacing between distinct content sections uses `space-xl` (24px).

## Elevation & Depth

Visual hierarchy uses crisp, tactile surface separation that remains clear even under direct outdoor sunlight or on budget mobile screens.

### Depth Stratification
- **Ground (Level 0):** Canvas `#F7F8FA`, flat without elevation.
- **Surface (Level 1):** Main content cards (`#FFFFFF`) with a 1px border (`#E6E9ED`) accompanied by a subtle ambient drop shadow: `0px 1px 3px rgba(15, 23, 42, 0.05), 0px 1px 2px rgba(15, 23, 42, 0.03)`.
- **Raised Interactive (Level 2):** Floating bars, active dropdown menus, and smart-paste action panels use: `0px 4px 12px -2px rgba(15, 23, 42, 0.08), 0px 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Overlays (Level 3):** Modal sheets, bottom sheets, and confirmation dialogs utilize: `0px 16px 32px -4px rgba(15, 23, 42, 0.16)` over a neutral scrim (`rgba(23, 33, 43, 0.4)`).

## Shapes

The interface balances soft friendliness with structured clarity through moderate corner roundness.

### Corner Radii Guidelines
- **Base Components (Inputs, Small Badges):** 8px (`rounded-md`).
- **Primary Buttons & Action Elements:** 10px to 12px radius, preserving a tactile, pill-adjacent look without fully rounded caps.
- **Containers & Order Cards:** 12px to 16px radius (`rounded-lg` to `rounded-xl`).
- **Bottom Sheets & Floating Trays:** Top corners set to 16px radius (`rounded-t-xl`), flat bottom.

## Components

### Buttons
- **Primary Action (CTA):** Minimum height 48px to satisfy accessibility standards for one-thumb interaction. Background `#0F766E`, text `#FFFFFF`, font weight `600`, radius 10–12px. Active press state shifts to `#115E59`.
- **Secondary / Ghost:** Height 48px. Background `#CCFBF1`, text `#0F766E`. Active press state shifts to `#99F6E4`.
- **Destructive:** Background `#DC2626`, text `#FFFFFF`. Used strictly for "Hapus Pesanan" or "Batalkan Transaksi".

### Input Fields & WhatsApp Smart Paste
- **Text Inputs:** Height 48px, background `#FFFFFF`, border 1px solid `#E6E9ED`, corner radius 10px, typography `body-md`. Focus state uses `#0F766E` with a 2px outline ring.
- **Smart Paste Box:** A specialized expanded text area for pasting unstructured WhatsApp chats. Outlined with a light teal dashed or solid border, accompanied by an immediate chip trigger: "Ekstrak Pesanan Otomatis".

### Status Chips & Badges
- Compact indicator badges with `label-sm` font, corner radius 6px, and 6px horizontal padding.
- **Lunas / Aman:** `#15803D` text on `#DCFCE7` background.
- **Menunggu Pembayaran / DP:** `#D97706` text on `#FEF3C7` background.
- **Batal / Habis:** `#DC2626` text on `#FEE2E2` background.
- **Draft / Parsing AI:** `#2563EB` text on `#DBEAFE` background.

### Cards (Pesanan & Finansial)
- Background `#FFFFFF`, border 1px solid `#E6E9ED`, border radius 14px, internal padding 16px (`space-lg`).
- Structure: Header row carries customer name and status chip; middle segment details order items and quantities; bottom segment carries bold tabular currency sum and action buttons (e.g., "Kirim Rincian WA", "Tagih Sisa").

### Lists & Dividers
- Lists employ full-bleed or inset 1px lines (`#E6E9ED`).
- Items have a minimum touch height of 56px with active tap feedback (`#F1F5F9`).

### Bottom Navigation Bar
- Fixed mobile navigation container at screen base, height 64px, background `#FFFFFF`, top border 1px solid `#E6E9ED`.
- 5 primary destinations: *Beranda*, *Pesanan*, *Smart Action* (center elevated teal target), *Keuangan*, and *Lainnya*.
- Center action trigger is raised with `#0F766E` fill and white icon for immediate order creation.