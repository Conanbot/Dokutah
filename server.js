'use strict';

  require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');

const { validateEnv } = require('./src/config/env');
const apiRoutes = require('./src/routes/index');
const { errorHandler } = require('./src/middleware/errorHandler');
const { requestLogger } = require('./src/middleware/logger');
const { connectSupabase } = require('./src/config/supabase');

validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

app.use(errorHandler);

const { connectDB } = require('./src/config/db');

const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectSupabase();
  } catch (err) {
    console.error('[SERVER] Gagal koneksi Supabase:', err.message);
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    console.warn('[DB] Direct PostgreSQL skip — server tetap jalan:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`📁 Static files from /public`);
    console.log(`🌐 APIs at http://localhost:${PORT}/api`);
    console.log(`🔗 Open dokter.html: http://localhost:${PORT}/dokter.html\n`);
  });
};
startServer();

const shutdown = (signal) => {
  console.log(`\n[SERVER] Received ${signal}, shutting down...`);
  server.close(() => {
    console.log('[SERVER] Closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);
console.log("URL:", process.env.SUPABASE_URL);