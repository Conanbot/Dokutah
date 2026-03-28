'use strict';

/**
 * src/middleware/validator.js
 * Middleware factory untuk validasi input request.
 *
 * Konsep JS yang diterapkan:
 * - Higher-Order Functions: validate() menerima fungsi schema dan mengembalikan middleware
 * - Closure: schema "diingat" oleh middleware yang dikembalikan
 * - Destructuring: dari req.body, req.params, req.query
 * - Arrow functions
 */

const { clientErrorResponse } = require('../utils/responseHelper');

/**
 * validate — HOF yang menerima schema validasi dan mengembalikan Express middleware.
 *
 * @param {Function} schema - fungsi yang menerima data dan mengembalikan { errors }
 * @param {'body'|'params'|'query'} [source='body'] - dari mana data diambil
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/pesan', validate(pemesananSchema), pemesananController.create);
 */
const validate = (schema, source = 'body') => {
  // Closure: schema "terbungkus" di dalam middleware
  return (req, res, next) => {
    const data   = req[source];
    const errors = schema(data); // jalankan fungsi schema

    if (errors.length > 0) {
      return clientErrorResponse(res, 'Validasi gagal. Periksa input Anda.', 400, errors);
    }

    next();
  };
};

// ─── Schema Definitions ───────────────────────────────────────────────────────
// Setiap schema adalah fungsi murni (pure function) yang menerima data
// dan mengembalikan array error string.

/**
 * pemesananSchema — validasi body untuk POST /api/pemesanan
 */
const pemesananSchema = ({ id_jadwal, nama_pasien } = {}) => {
  const errors = [];

  if (!id_jadwal)
    errors.push('id_jadwal wajib diisi.');
  if (!Number.isInteger(Number(id_jadwal)) || Number(id_jadwal) <= 0)
    errors.push('id_jadwal harus berupa angka positif.');
  if (!nama_pasien || typeof nama_pasien !== 'string')
    errors.push('nama_pasien wajib diisi.');
  if (nama_pasien && nama_pasien.trim().length < 3)
    errors.push('nama_pasien minimal 3 karakter.');

  return errors;
};

/**
 * koordinatSchema — validasi query params untuk endpoint `nearby`
 */
const koordinatSchema = ({ lat, lng } = {}) => {
  const errors = [];

  if (!lat || !lng)
    errors.push('Parameter lat dan lng wajib diisi.');
  if (lat && isNaN(parseFloat(lat)))
    errors.push('Parameter lat harus berupa angka desimal.');
  if (lng && isNaN(parseFloat(lng)))
    errors.push('Parameter lng harus berupa angka desimal.');

  return errors;
};

/**
 * artikelSchema — validasi body untuk POST /api/artikel (CMS)
 */
const artikelSchema = ({ judul, konten, kategori } = {}) => {
  const errors = [];

  if (!judul  || judul.trim().length < 5)   errors.push('judul minimal 5 karakter.');
  if (!konten || konten.trim().length < 50)  errors.push('konten minimal 50 karakter.');
  if (!kategori)                             errors.push('kategori wajib diisi.');

  return errors;
};

module.exports = {
  validate,
  schemas: { pemesananSchema, koordinatSchema, artikelSchema },
};
