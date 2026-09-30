/**
 * CJVELORA — Luxury Welcome Back Email Template
 * Minimalist, atelier aesthetic with high email client compatibility.
 */

interface WelcomeBackEmailOptions {
  firstName: string;
  siteUrl: string;
}

export function renderWelcomeBackHtml({ firstName, siteUrl }: WelcomeBackEmailOptions): string {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const collectionUrl = `${cleanSiteUrl}/#categories`;
  const resetPasswordUrl = `${cleanSiteUrl}/customer/forgot-password`;
  const safeName = firstName?.trim() ? firstName.trim() : 'Client';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome back to CJVELORA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #06090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #e5e7eb; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #06090e; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0d121a; border: 1px solid rgba(212, 175, 55, 0.22); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Accent Gold Line -->
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, #997825 0%, #d4af37 50%, #f4dc8a 100%);"></td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding: 44px 36px 24px 36px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; letter-spacing: 0.35em; color: #ffffff; text-transform: uppercase; font-family: 'Times New Roman', Times, Georgia, serif;">
                CJVELORA
              </div>
              <div style="font-size: 9px; letter-spacing: 0.4em; color: #d4af37; text-transform: uppercase; margin-top: 6px; font-weight: 500;">
                Atelier de Crochet
              </div>
              <div style="width: 48px; height: 1px; background-color: rgba(212, 175, 55, 0.4); margin: 24px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 10px 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 400; color: #ffffff; font-family: 'Times New Roman', Times, Georgia, serif; letter-spacing: 0.02em;">
                Welcome back, ${escapeHtml(safeName)}.
              </h1>
              
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.7; color: rgba(255, 255, 255, 0.75);">
                We&apos;re glad to see you again.
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.7; color: rgba(255, 255, 255, 0.6);">
                Your saved account and collection are waiting for you.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #d4af37;">
                    <a href="${collectionUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 34px; font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #0a0e14; text-decoration: none; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Explore Collection
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 12px 40px;">
              <div style="height: 1px; background-color: rgba(255, 255, 255, 0.08); width: 100%;"></div>
            </td>
          </tr>

          <!-- Security Footer Notice -->
          <tr>
            <td style="padding: 16px 40px 36px 40px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45);">
                Didn&apos;t sign in to CJVELORA?
              </p>
              <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.6; color: rgba(255, 255, 255, 0.5);">
                If this wasn&apos;t you, please secure your account by{' '}
                <a href="${resetPasswordUrl}" target="_blank" rel="noopener noreferrer" style="color: #d4af37; text-decoration: underline;">
                  resetting your password
                </a>.
              </p>
              
              <div style="font-size: 10px; letter-spacing: 0.15em; color: rgba(255, 255, 255, 0.25); text-transform: uppercase;">
                &copy; CJVELORA &bull; Handcrafted Luxury
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderWelcomeBackText({ firstName, siteUrl }: WelcomeBackEmailOptions): string {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const collectionUrl = `${cleanSiteUrl}/#categories`;
  const resetPasswordUrl = `${cleanSiteUrl}/customer/forgot-password`;
  const safeName = firstName?.trim() ? firstName.trim() : 'Client';

  return `CJVELORA
--------------------------------
Welcome back, ${safeName}.

We're glad to see you again.
Your saved account and collection are waiting for you.

Explore Collection: ${collectionUrl}

--------------------------------
Didn't sign in to CJVELORA?
If this wasn't you, please secure your account by resetting your password:
${resetPasswordUrl}

© CJVELORA`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
