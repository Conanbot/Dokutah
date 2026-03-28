'use strict';

/**
 * src/routes/faskesRoutes.js
 * Route definitions untuk resource /api/faskes
 *
 * Endpoint:
 *   GET  /api/faskes                         → semua faskes (filter: ?jenis=)
 *   GET  /api/faskes/jenis                   → daftar jenis faskes
 *   GET  /api/faskes/nearby?lat=&lng=&radius= → faskes terdekat (dari DB lokal)
 *   GET  /api/faskes/:id                     → detail faskes by ID
 */

const { Router } = require('express');
const { validate, schemas } = require('../middleware/validator');
const { getAll, getById, getNearby, getAllJenis } = require('../controllers/faskesController');

const router = Router();

router.get('/jenis',   getAllJenis);
router.get('/nearby',  validate(schemas.koordinatSchema, 'query'), getNearby);
router.get('/',        getAll);
router.get('/:id',     getById);

module.exports = router;
