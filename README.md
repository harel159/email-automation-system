# EmailProject(interview adition)

An interview-ready email system:
- **Manual Email** UI with rich text (Quill)
- **One-time attachments** (sent from memory, never stored for geeting our customer from time to time)
- **Per-recipient placeholders** in subject & body: `{{name}}`, `{{firstName}}`, `{{lastName}}`, `{{email}}`
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

## Environment setup

This project uses **two** env files:

### 1) `server/.env`  (backend — secrets live here)
Used by Node/Express only. **Do not put these in the client.**

```env
# server/.env
PORT=5000

# Postgres (Neon pooled URL)
DATABASE_URL=postgresql://neondb_owner:npg_T0Oe9EwJnDcI@ep-odd-lake-ab4qsktb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=emailsystemdemo1@gmail.com
EMAIL_PASS=zfcxinjmishwfwpz

# API token the backend expects from the client
EMAIL_API_TOKEN=Rd7mXN4JxLZp5VgT2KaBw9FqEsYU3RtP

# other server secrets
SESSION_SECRET=197774d70c1b626e3e15f9878d1003b6caa3d1b0f491f57c33643da61508bd53bdb20d0b4950058501ed9aff4e0e1b12
SHARED_USER_PASSWORD_HASH=$2b$10$i/4yjwUvNzu2hI4z5dp34.ehcW9NhQIuqV6RJueMklSrQGgqnLV5S
# encrypt keys
ENCRYPTION_SECRET=0a9a738b3a81ecabd897d39f205d5522a0c0442b15ef46e5cde18fbf32f5e9b27d0ec807877989db6591c6402bf1c04b
```

### 1) `client/.env.local` (frontend — exposed to the browser)
# client/.env.local
```
VITE_EMAIL_API_TOKEN=Rd7mXN4JxLZp5VgT2KaBw9FqEsYU3RtP
VITE_EMAIL_AUTOMATION_API_BASE_URL=http://localhost:5000
```

## Quick start
1) Create env files:
   - server/.env
   - client/.env.local

2) Run backend:
   npm run dev --prefix server

3) Run frontend:
   npm run dev --prefix client

##Demo flow 
Scenario 1 — Request info from authorities

1) Login: demo@gmail.com / password

2) Dashboard → Authorities Management → Add Authority (name + your email).

3) Information Request tab → (optional) Attachments: add or review files.

4) Content tab → select the authority you added.

5) (Optional) edit Subject/Body; Save Template to store for next login.

6) Send → check the email inbox you entered.

7) Dashboard shows Last Email Sent (for tracking).

Scenario 2 — Greet customers (broadcast)

1) Greeting Customers tab.

2) Add Customer (use your email).

3) Select your customer.

4) (Optional) set Sender Name and Reply-To.

5) Enter Subject/Body; (optional) add a one-time attachment.

6) Send → check your inbox.

7) (Optional) reply to the email and confirm it goes to the Reply-To address

## Security (intentional for interview)

Secrets are included here to allow anyone to run the demo without setup.
If you fork this repo, rotate credentials before making it public.
