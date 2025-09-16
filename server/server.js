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
import { query } from './db/index.js';
import clientRoutes from './routes/clientRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { sendBulkEmails, verifyEmailApiToken } from './controllers/emailController.js';

// -----------------------------
// Auth config
// -----------------------------
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'super_secret';
const PASSWORD_HASH = process.env.SHARED_USER_PASSWORD_HASH;

// a single demo user who can log in
const allowedUsers = [{ id: 1, email: 'demo@gmail.com' }];

// LocalStrategy: client sends { email, passwordEncrypted }
passport.use(
  new LocalStrategy({ usernameField: 'email', passwordField: 'passwordEncrypted' }, (email, encryptedPassword, done) => {
    const user = allowedUsers.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return done(null, false, { message: 'Invalid email' });

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_SECRET);
      const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
      const ok = bcrypt.compareSync(decryptedPassword, PASSWORD_HASH);
      if (!ok) return done(null, false, { message: 'Wrong password' });
      return done(null, user);
    } catch {
      return done(null, false, { message: 'Decryption failed' });
    }
  })
);


passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => {
  const user = allowedUsers.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  done(null, user || false);
});

// -----------------------------
// App & middleware
// -----------------------------
const app = express();

app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';


// CORS
const allowed = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Sessions (cookie-based)
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd, // set true behind HTTPS
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Body/file parsers
app.use(express.json());
app.use(fileUpload());

// Static
app.use('/uploads', express.static('uploads'));
app.use('/attachments', express.static('attachments'));

// -----------------------------
// Auth endpoints
// -----------------------------
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, email: req.user.email });
});

app.post('/api/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

app.get('/api/check-auth', (req, res) => {
  if (req.isAuthenticated()) return res.json({ authenticated: true, user: req.user });
  return res.status(401).json({ authenticated: false });
});

// Session guard for app routes
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// -----------------------------
// API routes
// -----------------------------

// Public token route (no session) — for interview quick demo if desired
app.post('/api/email/send-all-token', verifyEmailApiToken, sendBulkEmails);

// Session-protected app routes
app.post('/api/email/send-all', requireLogin, sendBulkEmails);
app.use('/api/email', requireLogin, emailRoutes);   // includes: template + attachments CRUD
app.use('/api/clients', requireLogin, clientRoutes);
app.use('/api/customers', requireLogin, customerRoutes);

// Example: authorities list (used by UI)
app.get('/api/authorities', requireLogin, async (req, res) => {
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
//Healthcheck route
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});


// -----------------------------
// Start
// -----------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
