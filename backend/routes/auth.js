import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { auth, asyncRoute, publicUser, issueToken, tokenCookieOptions } from '../middleware/auth.js';

export const authRoutes = express.Router();
// Strict budget for signup + login per IP: 30 attempts / 15 min is friendly to people
// behind a shared network but still stops credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' }
});

authRoutes.post('/signup', authLimiter, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 40) return res.status(400).json({ error: 'Name must be 2 to 40 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8 to 128 characters.' });
  if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  res.cookie('token', issueToken(user), tokenCookieOptions()).status(201).json({ user: publicUser(user) });
}));

authRoutes.post('/login', authLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.cookie('token', issueToken(user), tokenCookieOptions()).json({ user: publicUser(user) });
}));

authRoutes.post('/logout', (_req, res) => {
  res.clearCookie('token', { ...tokenCookieOptions(), maxAge: undefined }).status(204).end();
});

authRoutes.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
