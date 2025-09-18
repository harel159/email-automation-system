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
// Auth config
// -----------------------------
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'super_secret';
const PASSWORD_HASH = process.env.SHARED_USER_PASSWORD_HASH;

// single demo user
const allowedUsers = [{ id: 1, email: 'demo@gmail.com' }];

// -----------------------------
// App & basics
// -----------------------------
const app = express();
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';

// -----------------------------
// CORS (allowlist from env)
// -----------------------------
const allowed = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin or non-browser
    if (allowed.includes(origin)) return cb(null, true);

    // wildcard like https://*.vercel.app supported
    const w = allowed.find(a => a.startsWith('https://*.'));
    if (w) {
      const suffix = w.replace('https://*.', '');
      try {
        const host = new URL(origin).hostname;
        if (host.endsWith(suffix)) return cb(null, true);
      } catch {}
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// -----------------------------
// Body parsers BEFORE passport
// -----------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional uploads
app.use(fileUpload());

// -----------------------------
// Sessions THEN Passport
// -----------------------------
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// -----------------------------
// Passport strategy
// Accepts {email, passwordEncrypted} or {email, password}
// We normalize to "password" then decrypt and compare
// -----------------------------
passport.use('local',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    (email, encryptedPassword, done) => {
      const user = allowedUsers.find(
        u => u.email.toLowerCase() === String(email).toLowerCase()
      );
      if (!user) return done(null, false, { message: 'Invalid email' });

      try {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_SECRET);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return done(null, false, { message: 'Decryption failed' });

        const ok = bcrypt.compareSync(decrypted, PASSWORD_HASH);
        if (!ok) return done(null, false, { message: 'Wrong password' });

        return done(null, user);
      } catch (e) {
        return done(null, false, { message: 'Decryption failed' });
      }
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
  // normalize body so Passport always sees "password"
  (req, _res, next) => {
    const b = req.body || {};
    if (!b.password && b.passwordEncrypted) req.body.password = b.passwordEncrypted;
    next();
  },
  passport.authenticate('local', { failWithError: true }),
  (req, res) => res.json({ success: true, email: req.user.email }),
  // error -> send clear JSON (400 if missing, 401 otherwise)
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
// Guards & API routes
// -----------------------------
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/email/send-all-token', verifyEmailApiToken, sendBulkEmails);
app.post('/api/email/send-all', requireLogin, sendBulkEmails);
app.use('/api/email', requireLogin, emailRoutes);
app.use('/api/clients', requireLogin, clientRoutes);
app.use('/api/customers', requireLogin, customerRoutes);

app.get('/api/authorities', requireLogin, async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, active
       FROM authorities
       ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/authorities error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// -----------------------------
// Start
// -----------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
