// server/server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';

import customerRoutes from './routes/customerRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { sendBulkEmails, verifyEmailApiToken } from './controllers/emailController.js';
import { query } from './db/index.js';

// -----------------------------
// Auth config (ENV)
// -----------------------------
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET; // must match FE VITE_ENCRYPTION_SECRET
const SESSION_SECRET    = process.env.SESSION_SECRET || 'super_secret';
const PASSWORD_HASH     = process.env.SHARED_USER_PASSWORD_HASH; // bcrypt hash for demo user

const allowedUsers = [{ id: 1, email: 'demo@gmail.com' }];

// -----------------------------
// App
// -----------------------------
const app = express();
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';

// -----------------------------
// CORS — preconfigured for your setup
// -----------------------------
const PROD_ORIGIN = 'https://email-automation-system-steel.vercel.app';
const EXTRA_ORIGINS = ['http://localhost:5173']; // dev
const TEAM_SUFFIX = 'harel159s-projects.vercel.app'; // allow all previews for your account

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman/same-origin

    if (origin === PROD_ORIGIN || EXTRA_ORIGINS.includes(origin)) {
      return cb(null, true);
    }

    try {
      const host = new URL(origin).hostname;
      // allow any preview like https://<hash>-harel159s-projects.vercel.app
      if (host.endsWith(`.${TEAM_SUFFIX}`)) return cb(null, true);
    } catch { /* ignore */ }

    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight

// Prevent stale API caching
app.set('etag', false);
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// -----------------------------
// Body parsers & uploads
// -----------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// -----------------------------
// Sessions & Passport
// -----------------------------
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,              // needed for SameSite=None
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Safe decrypt helper
function decryptSafe(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_SECRET);
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    if (!plain) throw new Error('empty');
    return plain;
  } catch {
    return null;
  }
}

// Passport Strategy — accepts {email, passwordEncrypted} OR {email, password}
passport.use('local',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    (email, passwordOrEncrypted, done) => {
      const user = allowedUsers.find(
        u => u.email.toLowerCase() === String(email || '').toLowerCase()
      );
      if (!user) return done(null, false, { message: 'Invalid email' });

      const maybeClear = decryptSafe(passwordOrEncrypted) || passwordOrEncrypted;
      if (!maybeClear) return done(null, false, { message: 'Decryption failed' });

      const ok = bcrypt.compareSync(maybeClear, PASSWORD_HASH || '');
      if (!ok) return done(null, false, { message: 'Wrong password' });

      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => {
  const user = allowedUsers.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  done(null, user || false);
});

// -----------------------------
// Static
// -----------------------------
app.use('/uploads', express.static('uploads'));
app.use('/attachments', express.static('attachments'));

// -----------------------------
// Auth endpoints
// -----------------------------
app.post(
  '/api/login',
  // normalize: allow passwordEncrypted
  (req, _res, next) => {
    const b = req.body || {};
    if (!b.password && b.passwordEncrypted) req.body.password = b.passwordEncrypted;
    next();
  },
  passport.authenticate('local', { failWithError: true }),
  (req, res) => res.json({ success: true, email: req.user.email }),
  (err, _req, res, _next) => {
    const msg = err?.message || 'Auth failed';
    const code = /missing credentials/i.test(msg) ? 400 : 401;
    res.status(code).json({ ok: false, error: msg });
  }
);

app.post('/api/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

app.get('/api/check-auth', (req, res) => {
  if (req.isAuthenticated()) return res.json({ authenticated: true, user: req.user });
  return res.status(401).json({ authenticated: false });
});

// -----------------------------
// Guards & Routes
// -----------------------------
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/email/send-all-token', verifyEmailApiToken, sendBulkEmails);
app.post('/api/email/send-all', requireLogin, sendBulkEmails);
app.use('/api/email', requireLogin, emailRoutes);
app.use('/api/customers', requireLogin, customerRoutes);

// --- DIAG: what the server sees in email_logs
app.get('/api/__diag/logs', requireLogin, async (_req, res) => {
  const agg = await query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='sent') AS sent,
      MAX(created_at) AS last_any
    FROM public.email_logs
  `);
  const per = await query(`
    SELECT authority_id, MAX(created_at) AS last_sent_at
    FROM public.email_logs
    WHERE status='sent'
    GROUP BY authority_id
    ORDER BY authority_id
  `);
  res.json({ agg: agg.rows[0], perAuthority: per.rows });
});

// --- DIAG: run the exact join the route should use (schema-qualified)
app.get('/api/__diag/authorities', requireLogin, async (_req, res) => {
  const { rows } = await query(`
    SELECT
      a.id, a.name, a.email, a.active, a.created_at,
      MAX(el.created_at) FILTER (WHERE el.status='sent') AS last_sent_at
    FROM public.authorities a
    LEFT JOIN public.email_logs el ON el.authority_id = a.id
    GROUP BY a.id, a.name, a.email, a.active, a.created_at
    ORDER BY a.name ASC
  `);
  res.json(rows);
});


// ---- Authorities with lastEmailSent
async function listAuthoritiesHandler(_req, res) {
  try {
    const { rows } = await query(`
      SELECT
        a.id, a.name, a.email, a.active, a.created_at,
        MAX(el.created_at) FILTER (WHERE el.status = 'sent') AS last_sent_at
      FROM authorities a
      LEFT JOIN email_logs el ON el.authority_id = a.id
      GROUP BY a.id, a.name, a.email, a.active, a.created_at
      ORDER BY a.name ASC
    `);

    // expose both keys for compatibility (snake_case + camelCase)
    const shaped = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      active: r.active,
      createdAt: r.created_at,
      last_sent_at: r.last_sent_at ?? null,
      lastEmailSent: r.last_sent_at ?? null,
    }));

    res.json(shaped);
  } catch (err) {
    console.error('GET /api/authorities error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

app.get('/api/authorities', requireLogin, listAuthoritiesHandler);

// Keep any additional client routes
app.use('/api/clients', requireLogin, clientRoutes);

// -----------------------------
// Health
// -----------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// -----------------------------
// Start
// -----------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('CORS allow ->', {
    prod: PROD_ORIGIN,
    previewsSuffix: TEAM_SUFFIX,
    extra: EXTRA_ORIGINS
  });
});
