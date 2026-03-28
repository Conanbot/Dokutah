'use strict';

/**
 * src/controllers/mapsController.js
 * Handler untuk semua integrasi Google Maps Platform API.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await + fetch (via apiHelper)
 * - Promise.all untuk pencarian paralel
 * - Destructuring
 * - Higher-order functions
 * - Error handling
 */

const { googleMapsClient }                        = require('../utils/apiHelper');
const { parseCoordinates }                        = require('../utils/geoHelper');
const { successResponse, clientErrorResponse }    = require('../utils/responseHelper');

// Mapping jenis faskes ke tipe Google Places API
// Object.create(null) — pure map tanpa prototype
const JENIS_TO_GOOGLE_TYPE = Object.create(null);
JENIS_TO_GOOGLE_TYPE['rs']       = 'hospital';
JENIS_TO_GOOGLE_TYPE['klinik']   = 'doctor';
JENIS_TO_GOOGLE_TYPE['apotek']   = 'pharmacy';
JENIS_TO_GOOGLE_TYPE['puskesmas']= 'health';
JENIS_TO_GOOGLE_TYPE['gigi']     = 'dentist';

/**
 * searchNearby — GET /api/maps/nearby?lat=...&lng=...&jenis=...&radius=...
 * Mencari fasilitas kesehatan terdekat via Google Places API.
 */
const searchNearby = async (req, res, next) => {
  try {
    const { lat, lng, jenis = 'rs', radius = '5000' } = req.query;

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const googleType = JENIS_TO_GOOGLE_TYPE[jenis.toLowerCase()] || 'hospital';
    const results    = await googleMapsClient.searchNearby(userLocation, googleType, parseInt(radius, 10));

    successResponse(
      res,
      `${results.length} lokasi ditemukan di sekitar koordinat Anda.`,
      results,
      200,
      { user_location: userLocation, radius_m: parseInt(radius, 10), jenis },
    );
  } catch (err) {
    next(err);
  }
};

/**
 * searchAllFaskes — GET /api/maps/all?lat=...&lng=...
 * Mencari semua jenis faskes sekaligus menggunakan Promise.all (paralel).
 * Ini adalah endpoint utama untuk halaman peta "Belajar Lagi Dok".
 */
const searchAllFaskes = async (req, res, next) => {
  try {
    const { lat, lng, radius = '5000' } = req.query;

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    // Semua jenis faskes yang ingin ditampilkan di peta
    const jenisTarget = ['rs', 'klinik', 'apotek', 'puskesmas', 'gigi'];
    const googleTypes = jenisTarget.map((j) => JENIS_TO_GOOGLE_TYPE[j]);

    // Promise.all — semua request berjalan PARALEL (lebih cepat dari sequential)
    const allResults = await googleMapsClient.searchMultipleTypes(
      userLocation,
      googleTypes,
      parseInt(radius, 10),
    );

    // Re-map key dari google type kembali ke nama jenis kita
    const remapped = jenisTarget.reduce((acc, jenis, idx) => {
      acc[jenis] = allResults[googleTypes[idx]] || [];
      return acc;
    }, Object.create(null));

    const totalLokasi = Object.values(remapped)
      .reduce((sum, arr) => sum + arr.length, 0);

    successResponse(
      res,
      `${totalLokasi} total lokasi ditemukan.`,
      remapped,
      200,
      { user_location: userLocation, radius_m: parseInt(radius, 10) },
    );
  } catch (err) {
    next(err);
  }
};

/**
 * getPlaceDetails — GET /api/maps/detail/:placeId
 * Mendapatkan detail lengkap sebuah tempat dari Google Places.
 */
const getPlaceDetails = async (req, res, next) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return clientErrorResponse(res, 'Parameter placeId wajib diisi.', 400);
    }

    const detail = await googleMapsClient.getPlaceDetails(placeId);
    successResponse(res, 'Detail lokasi berhasil diambil.', detail);
  } catch (err) {
    next(err);
  }
};

/**
 * geocode — GET /api/maps/geocode?alamat=...
 * Mengonversi alamat teks ke koordinat lat/lng.
 */
const geocode = async (req, res, next) => {
  try {
    const { alamat } = req.query;

    if (!alamat) {
      return clientErrorResponse(res, 'Parameter alamat wajib diisi.', 400);
    }

    const result = await googleMapsClient.geocodeAddress(`${alamat}, Salatiga, Jawa Tengah, Indonesia`);

    if (!result) {
      return clientErrorResponse(res, 'Alamat tidak ditemukan.', 404);
    }

    successResponse(res, 'Koordinat berhasil didapatkan.', result);
  } catch (err) {
    next(err);
  }
};

module.exports = { searchNearby, searchAllFaskes, getPlaceDetails, geocode };
