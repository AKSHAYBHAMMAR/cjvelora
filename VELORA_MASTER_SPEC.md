# VELORA — Master Specification & Technical Architecture

## 1. Brand Identity & Vision
- **Brand Name**: VELORA
- **Tagline**: Made by Hand. Meant to Be Loved.
- **Positioning**: High-end luxury handcrafted crochet brand and lifestyle atelier. 
- **Core Principle**: Crochet First, Yarn Second. Handcrafted precision, warm sophistication, tactile glassmorphism.

## 2. Visual Design System (Stitch Fidelity)
- **Aesthetic**: Tactile Glassmorphism, Apple-inspired whitespace and structure meets warm handcrafted textures.
- **Color Palette**:
  - `ivory` / `warm-white`: `#F8F6F2`, `#FAF8F5`
  - `charcoal` (Primary text): `#1A1C1B`
  - `navy` (Primary luxury accent): `#00061F` / `#081D4A`
  - `soft-gold` (Hallmark gold accent): `#D4AF37` / `#C5A059`
  - `olive-accent` / `olive-dark`: `#6B705C` / `#4A503D`
  - `glass`: `rgba(255, 255, 255, 0.75)` with `backdrop-filter: blur(16px)` and 1px borders.
  - `stitched-divider`: 1px dashed seam mimicking running stitches.
- **Typography Hierarchy**:
  - Display/Headings: `Playfair Display` & `Cormorant Garamond`
  - Body/UI: `Inter`
  - Specs / Data / Badges: `Space Grotesk`
- **Corner Radii**: 24px (`1.5rem` / `rounded-3xl`) for cards & containers; Pill (`rounded-full`) for buttons, badges, chips.

## 3. Technology Stack
- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Styling**: Tailwind CSS configured with custom Stitch design tokens + Custom CSS modules/utilities
- **State Management**: Zustand (Persistent shopping cart, wishlist, UI drawer state)
- **Database & Auth (Phase 2+)**: Supabase + PostgreSQL (RLS, clean relational schema)
- **Payments (Phase 3+)**: Razorpay with strict server-side HMAC signature verification
- **Deployment & Hosting**: Production-grade Next.js configuration, SEO metadata, JSON-LD structured data.

## 4. Phase Breakdown
- **Phase 1: Visual Foundation & Homepage Experience**
  - Next.js + TypeScript setup with Stitch design tokens and fonts
  - Global responsive layout, tactile floating header, slide-out cart drawer, quick view modal
  - Two-column hero section with high-performance autoplaying loop video (`/videos/velora-hero.mp4`), fallback poster, and luxury CTAs
  - Crochet Collections Grid (Handmade Catalog)
  - Featured Crochet Masterpieces with quick-view, tags, and pricing
  - The Atelier Story (Brand heritage & Bento showcase)
  - Uncompromising Quality (Value proposition grid)
  - Step-by-Step Crafting Process timeline
  - Verified Client Testimonials & Social proof
  - Interactive FAQ accordion & Atelier Contact Form
  - Luxury Dark Atelier Footer & Newsletter signup
- **Phase 2: Product Catalog & Detail Experience**
  - Category and collection pages with dynamic filters, sorting, search
  - High-end Product Detail Page with multi-angle gallery, zoom, specs sheet, variants, production times
- **Phase 3: Shopping Cart & Checkout Engine**
  - Zustand cart with guest persistence, coupon code discounts, shipping rules
  - Server-side Razorpay payment order creation and cryptographic verification
- **Phase 4: Customer Accounts & Custom Orders**
  - Supabase Auth (Magic link / password / guest), order history, live parcel status tracker
  - Bespoke custom order commission request pipeline
- **Phase 5: Atelier Admin Dashboard**
  - Protected admin panel for inventory, order processing, custom order quotes, reviews moderation
- **Phase 6: Production Polish, SEO & Performance**
  - Lighthouse 95+ score, OpenGraph tags, schema.org markup, accessibility audit
