# EmailProject(interview edition)

An interview-ready email system:
- **Manual Email** UI with rich text (Quill)
- **One-time attachments** (sent from memory, never stored for greeting our customer from time to time)
- **Per-recipient placeholders** in subject & body: `{{name}}`, and optional for future `{{firstName}}`, `{{lastName}}`, `{{email}}`
- **Token-protected** send endpoint
- **PostgreSQL (Neon hosted)** for authorities, customers, attachment & logs
- **Nodemailer (SMTP)** for delivery from a real organization email
- RTL-friendly (wraps HTML with `dir="rtl"`)

## Requirements
- Node.js 18+  (tested with 22.14.0)

## Tech
- React + shadcn/ui
- Express / Node
- Nodemailer
- PostgreSQL (Neon)
- express-fileupload
- dotenv

## Production Environment
Use the live app in production: https://email-automation-system-steel.vercel.app

## Environment setup for local

This project uses **two** env files:

### 1) `server/.env`  (backend — secrets live here)
Used by Node/Express only. **Do not put these in the client.**

```env
# server/.env
PORT=5000

# Postgres (Neon pooled URL)
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=demo@example.com (replace with your email)
EMAIL_PASS=REPLACE_ME with app password (not real email password)

# Bulk send (token-protected endpoint)
EMAIL_API_TOKEN=REPLACE_ME

# Sessions & auth
SESSION_SECRET=REPLACE_ME
ENCRYPTION_SECRET=REPLACE_ME           # must match the client VITE_ENCRYPTION_SECRET
SHARED_USER_PASSWORD_HASH=REPLACE_ME   # bcrypt hash of your demo password (e.g. "password")
```

### 2) `client/.env.local` (frontend — exposed to the browser)

```
# must be identical to server ENCRYPTION_SECRET
VITE_ENCRYPTION_SECRET=REPLACE_ME
VITE_EMAIL_AUTOMATION_API_BASE_URL=http://localhost:5000
```

## Quick start

1. **Create env files**
   - `server/.env`
   - `client/.env.local`

2. **Run backend**
   ```bash
   npm run dev --prefix server
   ```


3. **Run frontend:**
   ```bash
   npm run dev --prefix client
   ```

## Demo flow 
## Scenario 1 — Request info from authorities

1) Login: demo@gmail.com / password

2) Dashboard → Authorities Management → Add Authority (name + your email).

3) Information Request tab → (optional) Attachments: add or review files.

4) Content tab → select the authority you added.

5) (Optional) edit Subject/Body; Save Template to store for next login.

6) Send → check the email inbox you entered.

7) Dashboard shows Last Email Sent (for tracking).

## Scenario 2 — Greet customers (broadcast)

1) Greeting Customers tab.

2) Add Customer (use your email).

3) Select your customer.

4) (Optional) set Sender Name and Reply-To.

5) Enter Subject/Body; (optional) add a one-time attachment.

6) Send → check your inbox.

7) (Optional) reply to the email and confirm it goes to the Reply-To address

## Security (intentional for interview)

- **No secrets in repo.** Use env vars in **Vercel** (client) and **Koyeb** (server). Keep `.env` out of git; placeholders like `REPLACE_ME` are intentional.
- **Credentials**
  - `ENCRYPTION_SECRET` (server) must equal `VITE_ENCRYPTION_SECRET` (client).
  - `SHARED_USER_PASSWORD_HASH` is the bcrypt of the demo password. Rotate whenever sharing.
  - **Do not** expose `EMAIL_API_TOKEN` in the client; call `/api/email/send-all-token` from server-side only.
- **CORS**
  - Locked to `https://email-automation-system-steel.vercel.app`, all previews under `*.harel159s-projects.vercel.app`, and `http://localhost:5173`. No wildcards in prod.
- **Email**
  - Use an SMTP **app password** (not a real user password). 
- **Files**
  - Limit upload size & types; reject executables.
- **Database**
  - Neon with SSL; least-privilege DB user; avoid logging PII; define backup/retention policy.
- **Logging & Monitoring**
  - Don’t log secrets; redact tokens. Keep `/health` and an `/api/__version` endpoint for sanity checks. Alert on 5xx spikes.
- **Data handling**
  - `email_logs` store metadata (status/timestamp). Support delete on request for authorities/customers; document retention if needed.
- **Threat model note**
  - Client-side AES is **demo convenience**, not real secrecy. 
