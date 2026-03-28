'use strict';

/**
 * src/routes/artikelRoutes.js
 * Route definitions untuk resource /api/artikel
 *
 * Endpoint:
 *   GET  /api/artikel                  → semua artikel (filter: ?kategori=&search=&page=&limit=)
 *   GET  /api/artikel/kategori         → daftar kategori
 *   GET  /api/artikel/:slug            → detail artikel by slug
 *   POST /api/artikel                  → buat artikel baru (CMS)
 */

const { Router } = require('express');
const { validate, schemas } = require('../middleware/validator');
const { getAll, getBySlug, getKategori, create } = require('../controllers/artikelController');

const router = Router();

// Statis dulu sebelum dinamis
router.get('/kategori', getKategori);
router.get('/',         getAll);
router.get('/:slug',    getBySlug);
router.post('/',        validate(schemas.artikelSchema, 'body'), create);

module.exports = router;
