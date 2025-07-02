// File: server.js
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import clientRoutes from './routes/clientRoutes.js';
import emailRoutes from './routes/emailRoutes.js';

dotenv.config();

const allowedUsers = [
  { id: 1, email: 'admin@roadprotect.co.il' },
  { id: 2, email: 'muni@roadprotect.co.il' },
  { id: 3, email: 'harel@roadprotect.co.il' }
];

const passwordHash = process.env.SHARED_USER_PASSWORD_HASH;

// ========== AUTH STRATEGY ==========
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  const user = allowedUsers.find(u => u.email === email);
  console.log(password);
  console.log(passwordHash);
  const test = (!bcrypt.compareSync(password, passwordHash));
    console.log(test);
  if (!user) return done(null, false, { message: 'Invalid email' });
  if (!bcrypt.compareSync(password, passwordHash)
) return done(null, false, { message: 'Wrong password' });
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => {
  const user = allowedUsers.find(u => u.email === email);
  done(null, user || false);
});

const app = express();

// ========== SESSION & CORS ==========
app.use(cors({
  origin: ['http://localhost:5173', 'http://185.229.226.173:3010'], // adjust if needed
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true for HTTPS
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/api/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.status(401).json({ authenticated: false });
  }
});


// ========== BASIC ROUTES ==========
app.use(express.json());
app.use(fileUpload());
app.use('/uploads', express.static('uploads'));
app.use('/attachments', express.static('attachments'));

// ========== LOGIN / LOGOUT ROUTES ==========
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, email: req.user.email });
});

app.post('/api/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

// ========== PROTECTED ROUTES ==========
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use('/api/clients', requireLogin, clientRoutes);
app.use('/api/email', requireLogin, emailRoutes);

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
