'use strict';

/**
 * src/controllers/dokterController.js
 * Handler untuk semua operasi data dokter.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await + try/catch
 * - Destructuring dari req.params, req.query
 * - Higher-order functions: map, filter
 * - Arrow functions
 */

const { query }                                          = require('../config/db');
const { successResponse, notFoundResponse }              = require('../utils/responseHelper');
const { AppError }                                       = require('../middleware/errorHandler');

/**
 * getAll — GET /api/dokter
 * Mendapatkan semua dokter, dengan optional filter spesialis.
 */
const getAll = async (req, res, next) => {
  try {
    const { spesialis, nama } = req.query; // Destructuring query params

    let sql    = `
      SELECT d.id_dokter, d.nama_dokter, d.spesialis, d.no_hp, d.foto_url,
             d.latitude, d.longitude, d.alamat_praktik,
             d.terima_bpjs, d.rating,
             json_agg(
               json_build_object('hari', j.hari, 'jam_mulai', j.jam_mulai, 'jam_selesai', j.jam_selesai, 'kuota', j.kuota_maksimal)
               ORDER BY j.hari
             ) FILTER (WHERE j.id_jadwal IS NOT NULL) AS jadwal
      FROM dokter d
      LEFT JOIN jadwal_praktik j ON d.id_dokter = j.id_dokter
    `;
    const params = [];
    const conditions = [];

    // Build dynamic WHERE clause berdasarkan query params
    if (spesialis) {
      params.push(`%${spesialis}%`);
      conditions.push(`d.spesialis ILIKE $${params.length}`);
    }
    if (nama) {
      params.push(`%${nama}%`);
      conditions.push(`d.nama_dokter ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' GROUP BY d.id_dokter ORDER BY d.nama_dokter ASC';

    const { rows } = await query(sql, params);
    successResponse(res, `${rows.length} dokter ditemukan.`, rows, 200, { total: rows.length });
  } catch (err) {
    next(err); // lempar ke global error handler
  }
};

/**
 * getById — GET /api/dokter/:id
 * Mendapatkan detail satu dokter berdasarkan ID.
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params; // Destructuring

    const { rows } = await query(
      `SELECT d.*, json_agg(
         json_build_object('id_jadwal', j.id_jadwal, 'hari', j.hari, 'jam_mulai', j.jam_mulai,
                           'jam_selesai', j.jam_selesai, 'kuota_maksimal', j.kuota_maksimal)
         ORDER BY j.hari
       ) FILTER (WHERE j.id_jadwal IS NOT NULL) AS jadwal
       FROM dokter d
       LEFT JOIN jadwal_praktik j ON d.id_dokter = j.id_dokter
       WHERE d.id_dokter = $1
       GROUP BY d.id_dokter`,
      [id],
    );

    if (!rows.length) return notFoundResponse(res, 'Dokter');

    successResponse(res, 'Detail dokter berhasil diambil.', rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * getBySpesialis — GET /api/dokter/spesialis/:jenis
 * Mencari dokter berdasarkan jenis spesialis.
 */
const getBySpesialis = async (req, res, next) => {
  try {
    const { jenis } = req.params;

    const { rows } = await query(
      `SELECT * FROM dokter WHERE spesialis ILIKE $1 ORDER BY rating DESC NULLS LAST`,
      [`%${jenis}%`],
    );

    successResponse(res, `Dokter spesialis ${jenis} ditemukan.`, rows, 200, { total: rows.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getBySpesialis };
