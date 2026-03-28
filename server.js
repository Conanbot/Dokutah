'use strict';

// ─── Load .env PERTAMA sebelum modul lain ────────────────────────────────────
// WAJIB di baris pertama agar semua modul di bawah sudah bisa baca process.env
require('dotenv').config();

/**
 * server.js — Entry Point Aplikasi "Belajar Lagi Dok"
 * Tugas Nico: Backend Node.js + Express
 *
 * File ini hanya bertanggung jawab sebagai titik masuk aplikasi.
 * Semua konfigurasi, route, dan middleware didelegasikan ke modul masing-masing.
 */

// ─── Core Modules ────────────────────────────────────────────────────────────
const path = require('path');
const http = require('http');

// ─── NPM Modules ─────────────────────────────────────────────────────────────
const express = require('express');
const cors    = require('cors');

// ─── Internal Modules ────────────────────────────────────────────────────────
const { validateEnv }     = require('./src/config/env');
// const { connectDB }     = require('./src/config/db');        // PostgreSQL
const { connectSupabase } = require('./src/config/supabase');  // Supabase
const apiRoutes           = require('./src/routes/index');
const { errorHandler }    = require('./src/middleware/errorHandler');
const { requestLogger }   = require('./src/middleware/logger');

// ─── Validasi Environment Variables ──────────────────────────────────────────
// Aplikasi BERHENTI jika ada env variable yang wajib tidak ada.
validateEnv();

// ─── Inisialisasi Aplikasi ────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // log setiap request masuk

// ─── Static Files (Melayani HTML dari Dava) ───────────────────────────────────
// Semua file HTML, CSS, JS frontend dilayani dari root folder.
// CATATAN: file frontend Dava (index.html, style.css, dll) harus berada
// di folder yang sama dengan server.js, atau sesuaikan path di bawah.
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Fallback: Kirim index.html untuk semua route yang tidak dikenal ──────────
// Diperlukan agar navigasi antar halaman HTML tetap berfungsi.
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler (HARUS di paling bawah) ────────────────────────────
app.use(errorHandler);

// ─── Jalankan Server ──────────────────────────────────────────────────────────
// Dibungkus async agar bisa await koneksi database sebelum server start.
const startServer = async () => {
  try {
    await connectSupabase(); // tunggu koneksi Supabase berhasil dulu

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`\n✅ [SERVER] Berjalan di http://localhost:${PORT}`);
      console.log(`📁 [STATIC] Melayani file frontend dari /public`);
      console.log(`🌐 [API]    Endpoint tersedia di http://localhost:${PORT}/api\n`);
    });

    // Graceful shutdown — matikan server dengan bersih saat proses dihentikan
    const shutdown = (signal) => {
      console.log(`\n[SERVER] Menerima ${signal}, mematikan server...`);
      server.close(() => {
        console.log('[SERVER] Server berhasil dimatikan.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[SERVER] Gagal start:', err.message);
    process.exit(1);
  }
};

startServer();
