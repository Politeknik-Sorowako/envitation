require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const { registerRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, 'data', 'envitation.db');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = initDatabase(DB_PATH);

registerRoutes(app, db);

app.listen(PORT, () => {
  console.log('=========================================');
  console.log('  ENVITATION - SQLite Backend');
  console.log('=========================================');
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log('=========================================');
});

process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});
