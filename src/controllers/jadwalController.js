'use strict';

/**
 * src/controllers/jadwalController.js
 * Handler untuk data jadwal praktik dokter.
 */

const { query }                           = require('../config/db');
const { successResponse, notFoundResponse } = require('../utils/responseHelper');

const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * getAll — GET /api/jadwal
 * Mengembalikan semua jadwal, joined dengan nama dokter.
 * Diurutkan berdasarkan urutan hari dalam seminggu.
 */
const getAll = async (req, res, next) => {
  try {
    const { id_dokter } = req.query;

    const params = [];
    let sql = `
      SELECT j.id_jadwal, j.hari, j.jam_mulai, j.jam_selesai, j.kuota_maksimal,
             d.id_dokter, d.nama_dokter, d.spesialis,
             (SELECT COUNT(*) FROM pemesanan p WHERE p.id_jadwal = j.id_jadwal) AS terisi
      FROM jadwal_praktik j
      JOIN dokter d ON j.id_dokter = d.id_dokter
    `;

    if (id_dokter) {
      params.push(id_dokter);
      sql += ` WHERE j.id_dokter = $1`;
    }

    const { rows } = await query(sql, params);

    // Sort berdasarkan urutan hari — Higher-order function (sort dengan comparator)
    const sorted = rows.sort((a, b) => {
      const idxA = URUTAN_HARI.indexOf(a.hari);
      const idxB = URUTAN_HARI.indexOf(b.hari);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    // Map untuk tambahkan field `sisa_kuota` — Higher-order function
    const enriched = sorted.map(({ terisi, kuota_maksimal, ...rest }) => ({
      ...rest,
      kuota_maksimal,
      terisi:      parseInt(terisi, 10),
      sisa_kuota:  kuota_maksimal - parseInt(terisi, 10),
      penuh:       parseInt(terisi, 10) >= kuota_maksimal,
    }));

    successResponse(res, 'Jadwal berhasil diambil.', enriched, 200, { total: enriched.length });
  } catch (err) {
    next(err);
  }
};

/**
 * getById — GET /api/jadwal/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT j.*, d.nama_dokter, d.spesialis,
              (SELECT COUNT(*) FROM pemesanan p WHERE p.id_jadwal = j.id_jadwal) AS terisi
       FROM jadwal_praktik j
       JOIN dokter d ON j.id_dokter = d.id_dokter
       WHERE j.id_jadwal = $1`,
      [id],
    );

    if (!rows.length) return notFoundResponse(res, 'Jadwal');

    const [jadwal] = rows; // Destructuring array
    const { terisi, kuota_maksimal } = jadwal; // Destructuring object

    successResponse(res, 'Detail jadwal berhasil diambil.', {
      ...jadwal,
      terisi:     parseInt(terisi, 10),
      sisa_kuota: kuota_maksimal - parseInt(terisi, 10),
      penuh:      parseInt(terisi, 10) >= kuota_maksimal,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById };
