'use strict';

/**
 * src/routes/mapsRoutes.js
 * Route definitions untuk integrasi Google Maps Platform
 *
 * Endpoint:
 *   GET /api/maps/nearby?lat=&lng=&jenis=&radius=   → cari 1 jenis faskes via Google Places
 *   GET /api/maps/all?lat=&lng=&radius=             → cari semua jenis sekaligus (paralel)
 *   GET /api/maps/detail/:placeId                   → detail tempat by Google place_id
 *   GET /api/maps/geocode?alamat=                   → konversi alamat → koordinat
 */

const { Router } = require('express');
const { validate, schemas }                               = require('../middleware/validator');
const { searchNearby, searchAllFaskes,
        getPlaceDetails, geocode }                        = require('../controllers/mapsController');

const router = Router();

router.get('/nearby',      validate(schemas.koordinatSchema, 'query'), searchNearby);
router.get('/all',         validate(schemas.koordinatSchema, 'query'), searchAllFaskes);
router.get('/detail/:osmId', getPlaceDetails);
router.get('/geocode',     geocode);

module.exports = router;
