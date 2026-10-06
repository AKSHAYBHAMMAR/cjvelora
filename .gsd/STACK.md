# Technology Stack



## Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | JavaScript runtime for Next.js application |
| Next.js | ^14.2.10 | React framework with App Router |
| React | ^18.3.1 | UI library |
| React DOM | ^18.3.1 | React DOM bindings |

## Core Technologies

### Framework
- **Next.js** (src/app/): Full-stack React framework with file-based routing, API routes, and server-side rendering
- **TypeScript** (tsconfig.json): Type safety across the codebase

### State Management
- **Zustand** (src/lib/store.ts:1): Persistent client-side state management for cart, wishlist, and UI modals
  - File: `src/lib/store.ts:1` - `import { create } from 'zustand'`
  - File: `src/lib/store.ts:36-129` - Store creation with persist middleware

### Styling
- **Tailwind CSS** (tailwind.config.ts): Utility-first CSS framework with custom design tokens
- **Tailwind Merge** (package.json:20): Class name merging for conditional styling
- **LUCIDE React** (package.json:15): Icon library

### UI Components
- **Custom components** (src/components/): Reusable UI following atomic design
- **shadcn/ui patterns**: Component-based UI architecture

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.115.0 | Supabase JavaScript client for database, auth, and storage |
| clsx | ^2.1.1 | Conditional className utility for Tailwind |
| lucide-react | ^0.441.0 | Icon library for React |
| resend | ^6.31.0 | Email delivery service |
| tailwind-merge | ^2.5.2 | Tailwind class conflict resolution |

## Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @types/node | ^20.16.5 | Node.js TypeScript types |
| @types/react | ^18.3.5 | React TypeScript types |
| @types/react-dom | ^18.3.0 | React DOM TypeScript types |
| autoprefixer | ^10.4.20 | CSS prefixer for Tailwind |
| postcss | ^8.4.45 | PostCSS configuration |
| tailwindcss | ^3.4.11 | Tailwind CSS v3 |
| typescript | ^5.6.2 | TypeScript compiler |

## Infrastructure

### Database
- **Supabase** (src/lib/supabase.ts): PostgreSQL database with real-time capabilities, authentication, and storage
  - File: `src/lib/supabase.ts` - Supabase client initialization

### Authentication
- **Supabase Auth** (src/lib/auth.ts): Email/password and social authentication
- **NextAuth.js** integration points in API routes

### File Storage
- **Supabase Storage** (src/lib/product-images.ts): Image uploads and management

### Email Services
- **Resend** (package.json:19): Transactional email service
- **Welcome back templates** (src/lib/email/welcomeBackTemplate.ts): Email templates

## Configuration

| Variable | Purpose | Location |
|----------|---------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | src/lib/supabase.ts |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key | src/lib/supabase.ts |
| Tailwind theme | Design tokens | tailwind.config.ts |
| Font configurations | Playfair Display, Cormorant Garamond, Inter, Space Grotesk | src/app/layout.tsx:11-35 |

---

*Last updated: 2026-10-06*