'use strict';

/**
 * src/controllers/mapsController.js
 * Handler untuk semua integrasi peta menggunakan Nominatim (OpenStreetMap).
 * 100% gratis, tanpa API key, tanpa kartu kredit.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await + fetch (native Node.js 18+)
 * - Promise.all untuk pencarian paralel
 * - Destructuring
 * - Higher-order functions (map, reduce, filter)
 * - Closure: nominatimClient dibuat sekali, dipakai berkali-kali
 * - Object.create(null) sebagai pure map
 * - Error handling
 *
 * Endpoint tersedia:
 *   GET /api/maps/nearby?lat=&lng=&jenis=&radius=   → cari faskes terdekat
 *   GET /api/maps/all?lat=&lng=&radius=             → cari semua jenis sekaligus (paralel)
 *   GET /api/maps/detail/:osmId                     → detail tempat by OSM ID
 *   GET /api/maps/geocode?alamat=                   → konversi alamat → koordinat
 */

const { parseCoordinates, enrichWithDistance } = require('../utils/geoHelper');
const { successResponse, clientErrorResponse } = require('../utils/responseHelper');

// ─── Nominatim Client (Closure) ───────────────────────────────────────────────
// Dibuat sebagai closure agar base config (headers, base URL) hanya ditulis sekali
// dan dipakai oleh semua fungsi di bawah tanpa duplikasi.
const nominatimClient = (() => {
  const BASE_URL = 'https://nominatim.openstreetmap.org';
  // User-Agent wajib diisi Nominatim — identifikasi aplikasi kita
  const HEADERS = {
    'User-Agent': 'BelajarLagiDok/1.0 (lomba ACLEC 2026; Salatiga)',
    'Accept-Language': 'id,en',
  };

  /**
   * fetchNominatim — helper internal untuk hit Nominatim API
   * @param {string} endpoint - path + query string
   * @returns {Promise<any>} - parsed JSON response
   */
  const fetchNominatim = async (endpoint) => {
    const url      = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  /**
   * searchNearby — cari fasilitas kesehatan di sekitar koordinat
   * Nominatim pakai amenity tag dari OpenStreetMap.
   *
   * @param {{ lat: number, lng: number }} userLocation
   * @param {string} amenityTag - tag OSM (hospital, clinic, pharmacy, dll)
   * @param {number} radiusKm - radius pencarian dalam kilometer
   * @returns {Promise<Array>}
   */
  const searchNearby = async (userLocation, amenityTag, radiusKm = 5) => {
    const delta   = radiusKm / 111; // 1 derajat ≈ 111 km
    const { lat, lng } = userLocation;

    const viewbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const endpoint = `/search?format=json&amenity=${amenityTag}&viewbox=${viewbox}&bounded=1&limit=20&addressdetails=1&countrycodes=id`;

    const raw = await fetchNominatim(endpoint);

    // Map hasil Nominatim ke format yang konsisten
    return raw.map((place) => ({
      osm_id:    place.osm_id,
      osm_type:  place.osm_type,
      nama:      place.display_name.split(',')[0],
      alamat:    place.display_name,
      latitude:  parseFloat(place.lat),
      longitude: parseFloat(place.lon),
      jenis:     amenityTag,
      sumber:    'OpenStreetMap / Nominatim',
    }));
  };

  /**
   * getDetail — ambil detail 1 tempat by OSM ID
   * @param {string} osmType - 'node', 'way', atau 'relation'
   * @param {string|number} osmId
   */
  const getDetail = async (osmType, osmId) => {
    const prefix   = osmType.charAt(0).toUpperCase();
    const endpoint = `/lookup?osms=${prefix}${osmId}&format=json&addressdetails=1`;
    const raw      = await fetchNominatim(endpoint);
    return raw[0] || null;
  };

  /**
   * geocode — konversi teks alamat ke koordinat lat/lng
   * @param {string} alamat
   */
  const geocode = async (alamat) => {
    const encoded  = encodeURIComponent(alamat);
    const endpoint = `/search?format=json&q=${encoded}&limit=1&addressdetails=1&countrycodes=id`;
    const raw      = await fetchNominatim(endpoint);

    if (!raw.length) return null;

    const { lat, lon, display_name } = raw[0];
    return {
      latitude:       parseFloat(lat),
      longitude:      parseFloat(lon),
      alamat_lengkap: display_name,
      sumber:         'OpenStreetMap / Nominatim',
    };
  };

  // Expose hanya fungsi yang diperlukan (encapsulation)
  return { searchNearby, getDetail, geocode };
})();

// ─── Mapping jenis faskes → tag amenity OpenStreetMap ─────────────────────────
// Object.create(null) — pure map tanpa prototype chain
const JENIS_TO_OSM_AMENITY = Object.create(null);
JENIS_TO_OSM_AMENITY['rs']        = 'hospital';
JENIS_TO_OSM_AMENITY['klinik']    = 'clinic';
JENIS_TO_OSM_AMENITY['apotek']    = 'pharmacy';
JENIS_TO_OSM_AMENITY['puskesmas'] = 'health_post';
JENIS_TO_OSM_AMENITY['gigi']      = 'dentist';

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * searchNearby — GET /api/maps/nearby?lat=&lng=&jenis=&radius=
 * Mencari satu jenis fasilitas kesehatan terdekat via Nominatim.
 * radius dalam meter (dikonversi ke km untuk Nominatim).
 */
const searchNearby = async (req, res, next) => {
  try {
    const { lat, lng, jenis = 'rs', radius = '5000' } = req.query;

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const amenityTag = JENIS_TO_OSM_AMENITY[jenis.toLowerCase()] || 'hospital';
    const radiusKm   = parseInt(radius, 10) / 1000;

    const results  = await nominatimClient.searchNearby(userLocation, amenityTag, radiusKm);
    const enriched = enrichWithDistance(results, userLocation, radiusKm);

    successResponse(
      res,
      `${enriched.length} lokasi ditemukan di sekitar koordinat Anda.`,
      enriched,
      200,
      { user_location: userLocation, radius_m: parseInt(radius, 10), jenis },
    );
  } catch (err) {
    next(err);
  }
};

/**
 * searchAllFaskes — GET /api/maps/all?lat=&lng=&radius=
 * Mencari SEMUA jenis faskes sekaligus menggunakan Promise.all (paralel).
 * Ini endpoint utama untuk halaman peta "Belajar Lagi Dok".
 */
const searchAllFaskes = async (req, res, next) => {
  try {
    const { lat, lng, radius = '5000' } = req.query;

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const radiusKm    = parseInt(radius, 10) / 1000;
    const jenisTarget = ['rs', 'klinik', 'apotek', 'puskesmas', 'gigi'];

    // Promise.all — semua request ke Nominatim berjalan PARALEL
    const allResults = await Promise.all(
      jenisTarget.map((jenis) =>
        nominatimClient
          .searchNearby(userLocation, JENIS_TO_OSM_AMENITY[jenis], radiusKm)
          .then((results) => enrichWithDistance(results, userLocation, radiusKm))
          .catch(() => []), // jika satu jenis gagal, jangan gagalkan semua
      ),
    );

    // Reduce: susun hasil ke object { rs: [...], klinik: [...], ... }
    const remapped = jenisTarget.reduce((acc, jenis, idx) => {
      acc[jenis] = allResults[idx];
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
 * getPlaceDetails — GET /api/maps/detail/:osmId
 * Format osmId: "node:12345" atau "way:67890" atau "relation:111"
 */
const getPlaceDetails = async (req, res, next) => {
  try {
    const { osmId } = req.params;

    if (!osmId) {
      return clientErrorResponse(res, 'Parameter osmId wajib diisi. Format: node:ID atau way:ID', 400);
    }

    const [osmType, osmIdNum] = osmId.split(':'); // Destructuring split result

    if (!osmType || !osmIdNum) {
      return clientErrorResponse(res, 'Format osmId tidak valid. Gunakan node:ID atau way:ID', 400);
    }

    const detail = await nominatimClient.getDetail(osmType, osmIdNum);

    if (!detail) {
      return clientErrorResponse(res, 'Lokasi tidak ditemukan di OpenStreetMap.', 404);
    }

    successResponse(res, 'Detail lokasi berhasil diambil.', detail);
  } catch (err) {
    next(err);
  }
};

/**
 * geocode — GET /api/maps/geocode?alamat=
 * Konversi alamat teks ke koordinat lat/lng via Nominatim.
 * Otomatis menambahkan konteks "Salatiga" agar hasil lebih akurat.
 */
const geocode = async (req, res, next) => {
  try {
    const { alamat } = req.query;

    if (!alamat) {
      return clientErrorResponse(res, 'Parameter alamat wajib diisi.', 400);
    }

    const alamatLengkap = `${alamat}, Salatiga, Jawa Tengah, Indonesia`;
    const result        = await nominatimClient.geocode(alamatLengkap);

    if (!result) {
      return clientErrorResponse(res, 'Alamat tidak ditemukan. Coba perjelas nama jalan atau kelurahan.', 404);
    }

    successResponse(res, 'Koordinat berhasil didapatkan.', result);
  } catch (err) {
    next(err);
  }
};

module.exports = { searchNearby, searchAllFaskes, getPlaceDetails, geocode };
