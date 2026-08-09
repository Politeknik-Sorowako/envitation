require('dotenv').config();

process.env.TZ = process.env.TZ || 'Asia/Makassar';

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { initDatabase } = require('./database');
const { registerRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, 'data', 'envitation.db');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://envitation.politekniksorowako.ac.id';

app.use(helmet({
  frameguard: { action: 'sameorigin' },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

app.disable('x-powered-by');

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

const db = initDatabase(DB_PATH);

registerRoutes(app, db, adminLimiter);

app.listen(PORT, () => {
  console.log('=========================================');
  console.log('  ENVITATION - SQLite Backend');
  console.log('=========================================');
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log(`  CORS:     ${ALLOWED_ORIGIN}`);
  console.log(`  TZ:       ${process.env.TZ}`);
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
