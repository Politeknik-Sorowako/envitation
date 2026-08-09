require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database');
const { registerRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, 'data', 'envitation.db');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://envitation.politekniksorowako.ac.id';

// Security: CORS restriction
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

// Security: Body size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security: Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Security: Hide X-Powered-By
app.disable('x-powered-by');

// Security: Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const db = initDatabase(DB_PATH);

registerRoutes(app, db, strictLimiter);

app.listen(PORT, () => {
  console.log('=========================================');
  console.log('  ENVITATION - SQLite Backend');
  console.log('=========================================');
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log(`  CORS:     ${ALLOWED_ORIGIN}`);
  console.log('=========================================');
});

process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  db.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});
