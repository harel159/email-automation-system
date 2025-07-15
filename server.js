// File: server.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';

import clientRoutes from './routes/clientRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { sendBulkEmails, verifyEmailApiToken } from './controllers/emailController.js';

dotenv.config();

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'super_secret';
const passwordHash = process.env.SHARED_USER_PASSWORD_HASH;

const allowedUsers = [
  { id: 1, email: 'admin@roadprotect.co.il' },
  { id: 2, email: 'muni@roadprotect.co.il' },
  { id: 3, email: 'harel@roadprotect.co.il' }
];

// ========== AUTH STRATEGY ==========
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, encryptedPassword, done) => {
  const user = allowedUsers.find(u => u.email === email);
  if (!user) return done(null, false, { message: 'Invalid email' });

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_SECRET);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
    if (!bcrypt.compareSync(decryptedPassword, passwordHash)) {
      return done(null, false, { message: 'Wrong password' });
    }
    return done(null, user);
  } catch {
    return done(null, false, { message: 'Decryption failed' });
  }
}));

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => {
  const user = allowedUsers.find(u => u.email === email);
  done(null, user || false);
});

const app = express();

// ✅ CORS FIRST
app.use(cors({
  origin: ['http://localhost:5173', 'http://185.229.226.173:3010'],
  credentials: true
}));

// ✅ SESSION AND PASSPORT BEFORE BODY PARSING
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true for HTTPS only
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ PARSERS AFTER SESSION
app.use(express.json());
app.use(fileUpload());

// ✅ STATIC FILES
app.use('/uploads', express.static('uploads'));
app.use('/attachments', express.static('attachments'));

// ✅ LOGIN / LOGOUT
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  console.log('✅ Session after login:', req.sessionID);
  res.json({ success: true, email: req.user.email });
});

app.post('/api/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

// ✅ CHECK AUTH
app.get('/api/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// ✅ PROTECTED ROUTE WRAPPER
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ✅ ROUTES SETUP

// 🔓 Public API token route (bypass session)
app.post('/api/email/send-all-token', verifyEmailApiToken, sendBulkEmails);

// 🔒 Session-protected routes
app.post('/api/email/send-all', requireLogin, sendBulkEmails);
app.use('/api/email', requireLogin, emailRoutes);
app.use('/api/clients', requireLogin, clientRoutes);

// ✅ START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
