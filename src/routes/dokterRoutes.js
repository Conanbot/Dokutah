'use strict';

/**
 * src/routes/dokterRoutes.js
 * Route definitions untuk resource /api/dokter
 *
 * Endpoint:
 *   GET  /api/dokter                    → semua dokter (filter: ?spesialis=&nama=)
 *   GET  /api/dokter/spesialis/:jenis   → dokter by spesialis
 *   GET  /api/dokter/:id                → detail dokter by ID
 */

const { Router } = require('express');
const { getAll, getById, getBySpesialis } = require('../controllers/dokterController');

const router = Router();

// URUTAN PENTING: route statis (/spesialis/:jenis) harus didaftarkan
// SEBELUM route dinamis (/:id) agar tidak salah match.
router.get('/spesialis/:jenis', getBySpesialis);
router.get('/',                 getAll);
router.get('/:id',              getById);

module.exports = router;
