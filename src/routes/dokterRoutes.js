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
const { getAll, getById, getBySpesialis, getBpjsDokter, getByFaskesKriteria } = require('../controllers/dokterController');

const router = Router();

// URUTAN PENTING: route statis harus didaftarkan SEBELUM dinamis
router.get('/bpjs',                getBpjsDokter);
router.get('/by-faskes/:id_faskes', getByFaskesKriteria);
router.get('/spesialis/:jenis', getBySpesialis);
router.get('/',                 getAll);
router.get('/:id',              getById);

module.exports = router;
