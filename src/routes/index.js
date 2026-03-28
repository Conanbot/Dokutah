'use strict';

/**
 * src/routes/index.js
 * Aggregasi semua route — satu titik terpusat untuk mendaftarkan semua API endpoint.
 *
 * Pola ini membuat server.js tetap bersih dan penambahan route baru cukup
 * dilakukan di sini tanpa menyentuh file lain.
 */

const { Router } = require('express');

const dokterRoutes    = require('./dokterRoutes');
const faskesRoutes    = require('./faskesRoutes');
const jadwalRoutes    = require('./jadwalRoutes');
const pemesananRoutes = require('./pemesananRoutes');
const mapsRoutes      = require('./mapsRoutes');
const artikelRoutes   = require('./artikelRoutes');

const router = Router();

// ─── Health Check ─────────────────────────────────────────────────────────────
// Endpoint ringan untuk cek apakah server hidup (berguna untuk deployment)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Belajar Lagi Dok API berjalan normal 🏥',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    scope: 'Kota Salatiga, Jawa Tengah',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
router.use('/dokter',    dokterRoutes);
router.use('/faskes',    faskesRoutes);
router.use('/jadwal',    jadwalRoutes);
router.use('/pemesanan', pemesananRoutes);
router.use('/maps',      mapsRoutes);
router.use('/artikel',   artikelRoutes);

module.exports = router;
