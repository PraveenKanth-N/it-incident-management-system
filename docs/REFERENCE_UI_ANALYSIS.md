# Reference UI Analysis: Team Computers Managed Services Replication

**Document Version:** 1.0.0  
**Project:** IT Incident Management and Resolution System  
**Workspace:** `d:\IT Incident Management and Resolution System`  
**Primary Video Reference:** `C:\Users\nivet\Videos\Screen Recordings\Screen Recording 2026-10-16 192814.mp4`  
**Reference Live URL:** `https://teamcomputers.com/managed-services/`  
**Keyframe Directory:** `docs/reference_frames/` (`frame_000s.jpg` through `frame_116s.jpg`)  
**Status:** Step 1 Verification Complete

---

## 1. Executive Summary & Objective

This document formalizes the observable visual design language, structural layout, typography, color palettes, micro-interactions, and component architecture extracted from the Team Computers reference video and live website.

The goal is **strict visual replication**: rather than building a generic enterprise software dashboard, the frontend of the **IT Incident Management and Resolution System** must reproduce the observable aesthetic:
1. Deep obsidian blacks and saturated multi-stop radial and linear gradients (Wine Red, Plum, Emerald Neon, Amber-Rose, Cyan-Azure).
2. Translucent glassmorphic metric cards with high-contrast gradient numerals.
3. Persistent solid black navigation bar with rich white mega-dropdown menus.
4. Interactive capability and portfolio cards featuring geometric abstract headers, smooth hover-reveals, and rounded pill CTA buttons with gradient fills.
5. High-density typography driven by **Montserrat** (display weights 700-900, body weights 400-500) paired with tabular monospaced numerics for SLA and system metrics.

---

## 2. Page Structure & Sectional Order

Based on the chronological recording timeline (116.8 seconds, 25 sampled keyframes):

| Section # | Video Timestamp | Section Name / Reference | Primary Visual Characteristics |
|---|---|---|---|
| **01** | `00:00 - 00:04` (`frame_000s`) | **Global Header & Hero Banner** | Pitch black `#000000` header; deep crimson/wine to dark purple radial backdrop; massive Montserrat headline; 4 translucent glassmorphic stat cards with vibrant gradient numerals. |
| **02** | `00:05 - 00:14` (`frame_005s`, `frame_010s`) | **Managed Services Portfolio Grid** | 4-column card grid on black `#000000`; dark geometric artwork headers; card title in bold white; hover state reveals description and peach-to-pink gradient pill button ("Learn More →"). |
| **03** | `00:15 - 00:35` (`frame_015s`, `frame_020s`, `frame_030s`) | **Delivery Centers / Operational Hub** | Rich plum-to-violet gradient; centered headline; dual-capsule tab switcher ("UTTARAKHAND" / "BANGALORE"); media preview viewport with purple-to-teal gradient pill CTA. |
| **04** | `00:40 - 00:55` (`frame_040s`, `frame_045s`) | **"Unlock the Future of IT" Pillars** | 3-column capability grid on `#000000`; glowing neon pastel square badges (AI Chip, Chess Knight, Target); Montserrat 700 headings with muted gray body prose. |
| **05** | `00:56 - 01:10` (`frame_055s`, `frame_060s`) | **Insights, Case Studies & Articles** | Horizontal card carousel; white cards with subtle bottom cyan glow gradient; circular arrow navigation controls with teal active state; date tag and "Know More →" links. |
| **06** | `01:11 - 01:25` (`frame_070s`, `frame_075s`) | **Mega-Navigation Menu Interaction** | Top nav hover on "What We Do"; floating rounded pure white mega-dropdown (`border-radius: 20px`); category list with icons on left, subcategories on right with subtle sky-blue hover. |
| **07** | `01:26 - 01:45` (`frame_085s`, `frame_090s`) | **"Zero Incident" Philosophy Section** | Neon emerald/lime green gradient headline; dark green radial glow vignette (`#054020` to `#000000`); centered mission typography for proactive incident prevention. |
| **08** | `01:46 - 01:56` (`frame_105s`, `frame_116s`) | **Company / Operations Overview** | Emerald green hero background; giant "About Us" text; white bold mission statement and leadership ethos. |

---

## 3. Visual Styling Specifications

### 3.1 Color Palette & Tokens

#### Canvas & Backgrounds
- **Header Background:** `#000000` (Solid Jet Black) with 1px border `rgba(255, 255, 255, 0.08)`.
- **Canvas Base:** `#000000` / `#050505` (Deep Obsidian).
- **Hero Crimson/Plum Radial:** `radial-gradient(ellipse at 20% 40%, #7A0026 0%, #3D003E 50%, #0D0017 100%)`.
- **Hero Emerald Radial (Zero Incident):** `radial-gradient(circle at 50% 30%, #054020 0%, #021A0D 60%, #000000 100%)`.
- **Card Background (Dark Glass):** `rgba(15, 23, 42, 0.70)` with `backdrop-filter: blur(14px)`.
- **Card Background (Light Carousel):** `linear-gradient(to bottom, #FFFFFF 65%, #E0F7FA 100%)`.
- **Mega-Dropdown Surface:** `#FFFFFF` (Solid White), `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`.

#### Gradient Accents & Multi-Stop Numerals
- **Rose/Pink Gradient (P1 / Critical SLA / High Impact):**
  `linear-gradient(135deg, #FF9A8B 0%, #FF6A88 55%, #FF99AC 100%)`
- **Cyan/Sky Gradient (P2 / High / Active Operations):**
  `linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)`
- **Emerald/Lime Gradient (P3 / Resolved / Zero Incident):**
  `linear-gradient(135deg, #00FF87 0%, #60EFA0 100%)`
- **Amber/Gold Gradient (P4 / Low / Licensing & Tools):**
  `linear-gradient(135deg, #FEE140 0%, #FA709A 100%)`
- **Purple-to-Teal CTA Gradient:**
  `linear-gradient(90deg, #603893 0%, #1582C5 100%)`
- **Amber-to-Magenta CTA Gradient:**
  `linear-gradient(90deg, #FDBB2D 0%, #E052A0 50%, #B845C2 100%)`

#### Text Colors
- **Display / Primary Headings:** `#FFFFFF` (Pure White).
- **Secondary / Subtitles:** `#E2E8F0` (Slate 200).
- **Body / Prose:** `#94A3B8` to `#CBD5E1` (Slate 400 - 300).
- **Dark Mode Card Text (Light Card):** `#1E293B` (Slate 900) for title, `#475569` (Slate 600) for body.
- **Teal Interactive Links:** `#00A3C4` / `#00B4D8`.

---

### 3.2 Typography & Hierarchy

- **Primary Font Family:** `'Montserrat', sans-serif` (Google Fonts).
- **Code / Metrics / SLA Monospace:** `'JetBrains Mono', monospace`.
- **Scale:**
  - `Display 1 (Hero Titles)`: `48px - 56px` | Weight: `800` or `900` | Line-Height: `1.15` | Tracking: `-0.02em`
  - `Headline Large (Section Titles)`: `36px - 40px` | Weight: `700` | Line-Height: `1.2`
  - `Headline Medium (Card Titles)`: `20px - 24px` | Weight: `700` | Line-Height: `1.3`
  - `Headline Small (Widget Sub-headers)`: `16px - 18px` | Weight: `600`
  - `Stat Huge Number`: `3.2rem - 3.8rem` | Weight: `800` | Multi-stop text gradient
  - `Body Standard`: `15px - 16px` | Weight: `400` | Line-Height: `1.6`
  - `Body Small / Metadata`: `13px - 14px` | Weight: `500`
  - `Micro Tag / Uppercase Category`: `11px - 12px` | Weight: `600` | Letter-Spacing: `0.05em` | Text-Transform: `uppercase`

---

### 3.3 Container Dimensions & Spacing

- **Max Container Width:** `1320px` (standard desktop container with 24px side gutters).
- **Header Height:** `76px` fixed, sticky with subtle blur and bottom hairline.
- **Section Vertical Padding:** `80px - 100px` top and bottom for major sections; `40px - 60px` for internal workspaces.
- **Card Corner Radii:**
  - Standard Cards & Modals: `20px` (`border-radius: 20px`).
  - Dropdown Panels: `20px`.
  - Buttons / Pill Chips: `9999px` (`border-radius: 9999px`).
  - Small Form Elements & Badges: `8px - 12px`.

---

### 3.4 Buttons & Interactive Controls

1. **Pill Gradient CTA (Primary Action):**
   - Shape: Rounded capsule (`border-radius: 9999px`).
   - Padding: `12px 28px`.
   - Font: Montserrat 600, 14px - 15px, white text.
   - Icon: Inline right arrow `→`.
   - Background: `linear-gradient(90deg, #603893 0%, #1582C5 100%)` or `linear-gradient(90deg, #FDBB2D 0%, #E052A0 50%, #B845C2 100%)`.
   - Hover: Transform `translateY(-2px)`, enhanced glow shadow `0 8px 24px rgba(224, 82, 160, 0.4)`.

2. **Capsule Tab Switcher:**
   - Active: Solid slate blue `#2B4C7E` or gradient fill, white bold text.
   - Inactive: Semi-transparent glass `rgba(255, 255, 255, 0.08)`, 1px border `rgba(255, 255, 255, 0.2)`, white text.

3. **Carousel Navigation Circles:**
   - Size: `44px × 44px` circular button.
   - Inactive: 1px border `rgba(255, 255, 255, 0.2)`, transparent background.
   - Active: Teal/Cyan solid `#00B4D8`, white vector arrow icon.

4. **Category Mega-Dropdown:**
   - Floating white popover with 2-column layout.
   - Item hover: Background `#F0F7FF`, text `#0F172A`, indicator chevron `›`.

---

## 4. Adaptation to the IT Incident Management System

To ensure functional integrity without compromising visual fidelity, the reference patterns map to application features as follows:

| Reference Pattern | Team Computers Reference Usage | IT Incident System Adaptation |
|---|---|---|
| **Top Navigation Bar & Mega Dropdown** | Corporate services, company overview, contact | Main navigation with Brand Logo, Incident Workspaces dropdown (New, Active, Triage, Closed), Role Portal switcher (Employee, Technician, Manager, Admin), SLA & Reports, User Profile & System Status pill. |
| **Hero Gradient & 4 Stat Cards** | 4 marketing statistics (clients, uptime, tickets, engineers) | **Operational SLA & Incident Command Hero**: 4 glassmorphic metric cards with vibrant multi-stop gradient numbers: Critical P1 Breaches (Rose/Pink), Active Triage Queue (Cyan/Sky), Resolved Today / 99.8% SLA (Emerald), Open Backlog (Amber). |
| **4-Column Services Portfolio Grid** | Managed service domains (Core Datacenter, Cloud, O&M, Workplace) | **ITIL Service & Incident Domain Cards**: Network & Hardware, Cloud & Infrastructure, Applications & ERP, Identity & Workplace. Each card has geometric header artwork, hover description, and "View Queue →" pill CTA. |
| **"Unlock the Future" 3 Pillars** | Shift-Left, AIOps, Performance Management | **Triage & Resolution Workflow Pillars**: AI Priority Prediction & Auto-Assignment, Automated Shift-Left Self-Healing, Rigorous ITIL SLA Governance. |
| **Interactive Delivery Center Hub** | Uttarakhand & Bangalore video showcases | **Technician Command Queue & Live Audit Hub**: Real-time ticket queue switcher ("ACTIVE QUEUE" / "ASSIGNED TO ME"), SLA burn-down monitor, quick assign controls. |
| **Article Carousel / Cards** | Case studies & CIO insight blogs | **Incident Timeline & Knowledge Resolution Base**: Searchable incident cards, resolution runbooks, root cause analysis logs with teal "View Details →" controls. |
| **Zero Incident Philosophy Banner** | Corporate marketing banner | **Zero Incident ITIL Health & Proactive Prevention Banner**: System health telemetry, uptime %, proactive alert suppression. |

---

## 5. Uncertainties & Markings

Per Step 1 guidelines:
1. *Mobile Navigation Transition:* The recording was captured at `1918×1016` desktop viewport. The exact mobile hamburger layout was not demonstrated in the video. We implement a responsive slide-out drawer adhering to the same black background, Montserrat typography, and pill button treatments.
2. *Video Player Controls:* The media in the Delivery Center section (`frame_030s`) is an embedded background video loop with customized overlay buttons rather than standard HTML5 controls. We reproduce the visual framing and overlay capsule buttons.

---

## 6. Implementation Checklist for Frontend

- [x] Reference video inspected across all keyframes.
- [x] Section order, color codes, gradients, typography, and card dimensions cataloged.
- [ ] Install/import `Montserrat` font family in `index.html`.
- [ ] Create `theme.css` with exact design tokens (colors, gradients, glassmorphism, pill radii).
- [ ] Build reusable UI components:
  - `Navbar` with brand logo, nav links, and interactive Mega-Dropdown.
  - `StatCard` with multi-stop gradient typography.
  - `IncidentDomainCard` with dark geometric visual, hover reveal, and gradient pill CTA.
  - `PillButton` (Primary gradient, Outline, Active tabs).
  - `HeroSection` with deep plum/crimson radial background and breadcrumbs.
- [ ] Integrate application shell with active incident triage data from Spring Boot `/api/v1/incidents`.
- [ ] Validate locally via Vite dev server and capture browser screenshots for fidelity verification.
