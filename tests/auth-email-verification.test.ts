import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderWelcomeBackHtml, renderWelcomeBackText } from '../src/lib/email/welcomeBackTemplate';
import fs from 'fs';
import path from 'path';

describe('CJVELORA — Authentication & Email Verification Architecture', () => {
  describe('Welcome Back Email Templates', () => {
    it('renders HTML email with CJVELORA branding, customer name, and collection URL', () => {
      const siteUrl = 'https://cjvelora.vercel.app';
      const html = renderWelcomeBackHtml({ firstName: 'Aria', siteUrl });

      assert.ok(html.includes('CJVELORA'), 'Must contain CJVELORA branding');
      assert.ok(html.includes('Welcome back, Aria.'), 'Must contain personalized salutation');
      assert.ok(html.includes('Explore Collection'), 'Must contain primary CTA');
      assert.ok(html.includes('https://cjvelora.vercel.app/#categories'), 'Must point to real collection');
      assert.ok(html.includes('https://cjvelora.vercel.app/customer/forgot-password'), 'Must link to password reset');
      assert.ok(html.includes("Didn&apos;t sign in to CJVELORA?"), 'Must contain security warning');
    });

    it('renders plaintext email with all required text fields', () => {
      const siteUrl = 'https://cjvelora.vercel.app';
      const text = renderWelcomeBackText({ firstName: 'Devon', siteUrl });

      assert.ok(text.includes('CJVELORA'), 'Must contain CJVELORA branding');
      assert.ok(text.includes('Welcome back, Devon.'), 'Must contain personalized salutation');
      assert.ok(text.includes('Explore Collection: https://cjvelora.vercel.app/#categories'));
      assert.ok(text.includes('https://cjvelora.vercel.app/customer/forgot-password'));
    });

    it('sanitizes customer name to prevent HTML injection in emails', () => {
      const maliciousName = '<script>alert("xss")</script>Emma';
      const html = renderWelcomeBackHtml({ firstName: maliciousName, siteUrl: 'https://cjvelora.vercel.app' });

      assert.ok(!html.includes('<script>'), 'Must not contain unescaped script tag');
      assert.ok(html.includes('&lt;script&gt;'), 'Must contain escaped HTML entities');
    });

    it('falls back to "Client" if name is missing or whitespace', () => {
      const html = renderWelcomeBackHtml({ firstName: '   ', siteUrl: 'https://cjvelora.vercel.app' });
      assert.ok(html.includes('Welcome back, Client.'), 'Must fall back gracefully to Client');
    });
  });

  describe('Database Migration & Idempotency Schema', () => {
    it('migration file exists and defines customer_login_notifications with UNIQUE(user_id, session_id)', () => {
      const migrationPath = path.join(process.cwd(), 'supabase', 'migration_customer_auth_notifications.sql');
      assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert.ok(sql.includes('customer_login_notifications'), 'Must define customer_login_notifications');
      assert.ok(sql.includes('UNIQUE(user_id, session_id)'), 'Must enforce UNIQUE(user_id, session_id)');
      assert.ok(sql.includes('customer_login_events'), 'Must define customer_login_events');
      assert.ok(sql.includes('record_customer_login_event'), 'Must define atomic evaluator RPC');
      assert.ok(sql.includes('mark_welcome_back_sent'), 'Must define mark_welcome_back_sent RPC');
      assert.ok(sql.includes('ROW LEVEL SECURITY'), 'Must enforce RLS');
    });
  });

  describe('Welcome Back API Route Integrity', () => {
    it('route file exists, requires Authorization Bearer token, and never trusts recipient email from client', () => {
      const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'welcome-back', 'route.ts');
      assert.ok(fs.existsSync(routePath), 'API route must exist');

      const code = fs.readFileSync(routePath, 'utf8');
      assert.ok(code.includes('authorization'), 'Must inspect authorization header');
      assert.ok(code.includes('supabase.auth.getUser'), 'Must verify session with Supabase');
      assert.ok(code.includes('user.email'), 'Must obtain email strictly from verified session user');
      assert.ok(code.includes('RESEND_API_KEY'), 'Must use RESEND_API_KEY only on server');
      assert.ok(code.includes('renderWelcomeBackHtml'), 'Must use verified template');
      assert.ok(!code.includes('req.body.email'), 'Must NEVER accept arbitrary recipient email from client body');
    });
  });

  describe('Auth Functions & Unverified Account Security', () => {
    it('src/lib/auth.ts blocks unverified accounts and signs out unconfirmed sessions', () => {
      const authPath = path.join(process.cwd(), 'src', 'lib', 'auth.ts');
      const code = fs.readFileSync(authPath, 'utf8');

      assert.ok(code.includes('isUnverified'), 'Must return isUnverified flag');
      assert.ok(code.includes('Please verify your email before signing in.'), 'Must enforce verification error');
      assert.ok(code.includes('triggerWelcomeBackNotification'), 'Must export triggerWelcomeBackNotification');
      assert.ok(code.includes('needsEmailConfirmation'), 'Must enforce needsEmailConfirmation');
    });
  });

  describe('Verification Screen UI Standards', () => {
    it('src/components/auth/EmailVerificationNotice.tsx fulfills all Phase 1 copy and action requirements', () => {
      const noticePath = path.join(process.cwd(), 'src', 'components', 'auth', 'EmailVerificationNotice.tsx');
      const rawCode = fs.readFileSync(noticePath, 'utf8');
      const code = rawCode.replace(/&apos;/g, "'");

      assert.ok(code.includes('CJVELORA'), 'Must contain CJVELORA branding');
      assert.ok(code.includes('Check your inbox'), 'Must have Check your inbox');
      assert.ok(code.includes("You're almost there."), "Must have You're almost there.");
      assert.ok(code.includes("We've sent a verification link to"), "Must have We've sent a verification link to");
      assert.ok(code.includes('Verify your email address to activate your CJVELORA account.'), 'Must have account activation notice');
      assert.ok(code.includes('Open Email'), 'Must have Open Email primary button');
      assert.ok(code.includes('Resend verification email'), 'Must have Resend verification email');
      assert.ok(code.includes("Didn't receive the email?"), "Must have Didn't receive the email?");
      assert.ok(code.includes('Check your spam or promotions folder.'), 'Must have Check your spam or promotions folder');
      assert.ok(code.includes('Back to Sign In'), 'Must have Back to Sign In');
      assert.ok(code.includes('cooldown'), 'Must implement 60-second cooldown');
    });
  });
});
