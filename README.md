# CJVELORA — Luxury Handcrafted Crochet Atelier

CJVELORA is an artisanal luxury ecommerce platform designed for bespoke heirloom crochet creations. Built with Next.js App Router, TypeScript, Supabase PostgreSQL, and Razorpay.

---

## Authentication

CJVELORA utilizes a hardened, role-separated authentication system built on **Supabase Auth** as the authoritative identity provider, paired with **Resend** for transactional email delivery.

### Features

- **Email & Password Registration**: Customers can register with their Full Name, Email, and Password. Passwords require a minimum of 8 characters and confirmation matching.
- **Mandatory Email Verification**: To preserve security and account authenticity, newly registered email accounts require verification prior to accessing the private clientele portal. Unverified sessions are signed out automatically upon registration.
- **Verification Screen & Smart Resend**: The email verification screen provides an "Open Email" action that intelligently routes users to their respective webmail provider (Gmail, Outlook, Yahoo, iCloud, Proton) or email client, alongside a "Resend verification email" action guarded by a 60-second cooldown timer.
- **Google OAuth Authentication**: Seamless one-tap authentication via Google OAuth, automatically routing through the `/auth/callback` verification handler while securely preserving the intended destination.
- **Password Recovery Flow**: Dedicated forgot-password and reset-password flows with secure, time-limited recovery links dispatched via Supabase Auth.
- **Returning-Customer Welcome Back Email**: Upon authenticating into an existing account, returning customers receive a branded, luxury HTML Welcome Back notification pointing to the collection catalog.
  - **First-Time vs Returning Detection**: An atomic database RPC (`record_customer_login_event`) deterministically identifies whether an authentication event is a first-time signup/activation or a returning customer login, without relying on fragile timestamp deltas.
  - **Session Deduplication**: The `customer_login_notifications` database table enforces `UNIQUE(user_id, session_id)`, preventing duplicate emails across page reloads, tab restorations, component mounts, and token refreshes.
- **Role Separation**: Administrator and customer accounts are strictly separated via database-enforced role verification and Row Level Security (RLS) policies.

### Email Delivery Architecture

- **Supabase Auth**: Manages signup confirmation links, verification callbacks, and password recovery emails.
- **Resend**: Delivers the custom, luxury-formatted Welcome Back email (`/api/auth/welcome-back`).

### Production Configuration Requirements

Production email delivery requires:
1. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key.
   - `NEXT_PUBLIC_SITE_URL`: Canonical production URL (e.g., `https://cjvelora.vercel.app`).
   - `RESEND_API_KEY`: Server-side API key for Resend (kept confidential; never exposed to client bundles).
   - `RESEND_FROM_EMAIL`: Verified sender email address (e.g., `CJVELORA <orders@yourdomain.com>`).
2. **Supabase Dashboard Configuration**:
   - **Authentication → Providers → Email**: Ensure "Confirm email" is enabled.
   - **Authentication → URL Configuration**: Whitelist canonical site and redirect URLs (`/auth/callback`).
   - **Project Settings → Authentication → SMTP Settings**: Configure Custom SMTP using your verified domain via Resend (`smtp.resend.com`).
   - **Database Migration**: Execute `supabase/migration_customer_auth_notifications.sql` in the Supabase SQL Editor.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Transactional Emails**: Resend & Supabase Auth
- **Payments**: Razorpay with cryptographic HMAC signature verification
- **State Management**: Zustand
