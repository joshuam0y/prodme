# Supabase Email Templates

Use these files as ready-to-paste HTML for Supabase Auth emails.

Project values:
- Site URL: `https://prodlinkapp.vercel.app`
- Logo URL: `https://prodlinkapp.vercel.app/prodlink-logo-v2.svg`

## What Goes Where

In Supabase, open:
- `Authentication` -> `Email Templates`

Then paste these files into these template editors:

- `Confirm signup` -> `docs/supabase-email-templates/confirm-signup.html`
- `Magic Link` -> `docs/supabase-email-templates/magic-link.html`
- `Reset Password` -> `docs/supabase-email-templates/reset-password.html`
- `Invite user` -> `docs/supabase-email-templates/invite-user.html`
- `Change Email Address` -> `docs/supabase-email-templates/change-email.html`

## Exact Steps

1. Open your Supabase project dashboard.
2. Go to `Authentication`.
3. Click `Email Templates`.
4. Open `Confirm signup`.
5. Replace the existing HTML with the contents of `confirm-signup.html`.
6. Click `Save`.
7. Repeat for the other templates using the mapping above.

## URL Configuration

In Supabase, also check:
- `Authentication` -> `URL Configuration`

Set:
- `Site URL` -> `https://prodlinkapp.vercel.app`

Make sure your allowed redirect URLs include at least:
- `https://prodlinkapp.vercel.app/auth/callback`
- `http://127.0.0.1:3000/auth/callback`

If Supabase shows a list for additional redirect URLs, add both.

## Important Notes

- Keep Supabase variables like `{{ .ConfirmationURL }}` exactly as they are in the HTML files.
- Do not replace `{{ .ConfirmationURL }}` with your site URL.
- If an email client renders SVG poorly, replace the logo URL in the templates with a hosted PNG version.
