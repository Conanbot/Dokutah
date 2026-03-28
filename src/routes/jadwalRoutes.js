'use strict';

/**
 * src/routes/jadwalRoutes.js
 * Route definitions untuk resource /api/jadwal
 *
 * Endpoint:
 *   GET  /api/jadwal          → semua jadwal (filter: ?id_dokter=)
 *   GET  /api/jadwal/:id      → detail jadwal + sisa kuota
 */

const { Router } = require('express');
const { getAll, getById } = require('../controllers/jadwalController');

const router = Router();

router.get('/',    getAll);
router.get('/:id', getById);

module.exports = router;
