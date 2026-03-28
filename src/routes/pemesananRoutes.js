'use strict';

/**
 * src/routes/pemesananRoutes.js
 * Route definitions untuk resource /api/pemesanan
 *
 * Endpoint:
 *   GET    /api/pemesanan?id_jadwal=  → daftar pemesanan per jadwal
 *   POST   /api/pemesanan             → buat pemesanan baru
 *   DELETE /api/pemesanan/:id         → batalkan pemesanan
 */

const { Router } = require('express');
const { validate, schemas } = require('../middleware/validator');
const { create, getByJadwal, cancel } = require('../controllers/pemesananController');

const router = Router();

router.get('/',    getByJadwal);
router.post('/',   validate(schemas.pemesananSchema, 'body'), create);
router.delete('/:id', cancel);

module.exports = router;
