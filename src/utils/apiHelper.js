'use strict';

/**
 * src/utils/apiHelper.js
 * Utility untuk memanggil Google Maps Platform API dari backend.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await + Fetch API (Node 18+ native fetch)
 * - Promise.all: memanggil beberapa API secara paralel
 * - Closure: createGoogleMapsClient menyimpan apiKey
 * - Destructuring
 * - Error handling dengan custom Error
 * - Arrow functions
 */

const BASE_URLS = Object.freeze({
  PLACES_NEARBY:  'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  PLACES_DETAILS: 'https://maps.googleapis.com/maps/api/place/details/json',
  GEOCODE:        'https://maps.googleapis.com/maps/api/geocode/json',
  DIRECTIONS:     'https://maps.googleapis.com/maps/api/directions/json',
});

/**
 * ApiError — Custom Error untuk error yang berasal dari API Google.
 * Menggunakan Object.create untuk prototype-based inheritance.
 */
const createApiError = (message, statusCode = 502) => {
  const err = Object.create(Error.prototype);
  err.message     = message;
  err.statusCode  = statusCode;
  err.isApiError  = true;
  err.name        = 'ApiError';
  return err;
};

/**
 * buildUrl — membangun URL dengan query parameters.
 * Menggunakan URLSearchParams (core Node module).
 *
 * @param {string} base
 * @param {object} params
 * @returns {string}
 */
const buildUrl = (base, params) => {
  const searchParams = new URLSearchParams(params);
  return `${base}?${searchParams.toString()}`;
};

/**
 * createGoogleMapsClient — Closure Factory.
 * Membuat client dengan apiKey yang "diingat" di dalam closure.
 * Semua method client otomatis menyertakan API key.
 *
 * @param {string} apiKey - Google Maps API Key dari .env
 * @returns {object} client dengan berbagai method
 */
const createGoogleMapsClient = (apiKey) => {
  if (!apiKey) throw new Error('[API] GOOGLE_MAPS_API_KEY tidak ditemukan di .env');

  /**
   * fetchJson — helper internal untuk fetch + parse JSON.
   * Hanya bisa diakses dari dalam closure (private).
   */
  const fetchJson = async (url) => {
    const response = await fetch(url);

    if (!response.ok) {
      throw createApiError(
        `Google Maps API merespons dengan status ${response.status}`,
        response.status,
      );
    }

    const data = await response.json();

    // Google API mengembalikan status di body, bukan HTTP status
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw createApiError(`Google Maps API Error: ${data.status} — ${data.error_message || ''}`);
    }

    return data;
  };

  // ─── Public Methods ─────────────────────────────────────────────────────────

  /**
   * searchNearby — mencari tempat di sekitar koordinat tertentu.
   *
   * @param {{ lat: number, lng: number }} location
   * @param {string} type - tipe lokasi Google (hospital, pharmacy, clinic, dll)
   * @param {number} [radius=5000] - radius pencarian dalam meter
   * @returns {Promise<Array>}
   */
  const searchNearby = async ({ lat, lng }, type, radius = 5000) => {
    const url = buildUrl(BASE_URLS.PLACES_NEARBY, {
      location: `${lat},${lng}`,
      radius,
      type,
      language: 'id',
      key: apiKey,
    });

    const { results } = await fetchJson(url);
    // Map hasil ke format yang lebih ringkas — Higher-order function
    return results.map(({ place_id, name, vicinity, geometry, rating, opening_hours }) => ({
      place_id,
      nama:      name,
      alamat:    vicinity,
      latitude:  geometry.location.lat,
      longitude: geometry.location.lng,
      rating:    rating ?? null,
      buka:      opening_hours?.open_now ?? null,
    }));
  };

  /**
   * getPlaceDetails — mendapatkan detail lengkap sebuah tempat by place_id.
   *
   * @param {string} placeId
   * @returns {Promise<object>}
   */
  const getPlaceDetails = async (placeId) => {
    const url = buildUrl(BASE_URLS.PLACES_DETAILS, {
      place_id: placeId,
      fields:   'name,formatted_address,formatted_phone_number,opening_hours,geometry,rating,website',
      language: 'id',
      key:      apiKey,
    });

    const { result } = await fetchJson(url);
    return result;
  };

  /**
   * geocodeAddress — mengonversi alamat teks menjadi koordinat lat/lng.
   *
   * @param {string} address
   * @returns {Promise<{ lat: number, lng: number } | null>}
   */
  const geocodeAddress = async (address) => {
    const url = buildUrl(BASE_URLS.GEOCODE, {
      address,
      region: 'id',
      key:    apiKey,
    });

    const { results } = await fetchJson(url);
    if (!results.length) return null;

    const { lat, lng } = results[0].geometry.location;
    return { lat, lng, formatted_address: results[0].formatted_address };
  };

  /**
   * searchMultipleTypes — mencari beberapa tipe tempat secara PARALEL.
   * Menggunakan Promise.all agar tidak harus menunggu satu per satu.
   *
   * @param {{ lat: number, lng: number }} location
   * @param {string[]} types - array tipe lokasi
   * @param {number}   [radius=5000]
   * @returns {Promise<object>} hasil pengelompokan per type
   */
  const searchMultipleTypes = async (location, types, radius = 5000) => {
    // Promise.all: semua request jalan bersamaan (paralel)
    const results = await Promise.all(
      types.map((type) => searchNearby(location, type, radius).catch(() => [])),
    );

    // Gabungkan hasil ke object dengan key = nama tipe
    return types.reduce((acc, type, index) => {
      acc[type] = results[index];
      return acc;
    }, Object.create(null));
  };

  // Kembalikan public API client
  return Object.freeze({ searchNearby, getPlaceDetails, geocodeAddress, searchMultipleTypes });
};

// Buat satu instance client yang dipakai oleh seluruh aplikasi
// Ini adalah Singleton via module cache — Node.js hanya menjalankan modul sekali
const googleMapsClient = createGoogleMapsClient(process.env.GOOGLE_MAPS_API_KEY);

module.exports = { googleMapsClient, createApiError };
