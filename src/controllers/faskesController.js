'use strict';

/**
 * src/controllers/faskesController.js
 * Handler untuk data fasilitas kesehatan (puskesmas, klinik, RS, apotek).
 *
 * Konsep JS yang diterapkan:
 * - Async/Await
 * - Destructuring
 * - Higher-order functions: enrichWithDistance dari geoHelper
 * - Promise.all: query paralel untuk data gabungan
 * - Arrow functions
 */

const { query }                                         = require('../config/db');
const { successResponse, notFoundResponse,
        clientErrorResponse }                           = require('../utils/responseHelper');
const { enrichWithDistance, parseCoordinates }          = require('../utils/geoHelper');

/**
 * getAll — GET /api/faskes
 * Mendapatkan semua faskes, optional filter by jenis.
 */
const getAll = async (req, res, next) => {
  try {
    const { jenis } = req.query;

    const params = [];
    let sql = 'SELECT * FROM faskes';

    if (jenis) {
      params.push(jenis.toLowerCase());
      sql += ` WHERE jenis = $1`;
    }

    sql += ' ORDER BY nama ASC';

    const { rows } = await query(sql, params);
    successResponse(res, 'Data faskes berhasil diambil.', rows, 200, { total: rows.length });
  } catch (err) {
    next(err);
  }
};

/**
 * getById — GET /api/faskes/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM faskes WHERE id_faskes = $1', [id]);

    if (!rows.length) return notFoundResponse(res, 'Fasilitas Kesehatan');
    successResponse(res, 'Detail faskes berhasil diambil.', rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * getNearby — GET /api/faskes/nearby?lat=...&lng=...&radius=...&jenis=...
 * Mencari faskes terdekat dari koordinat pengguna.
 * Menggunakan enrichWithDistance (HOF dari geoHelper).
 */
const getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = '10', jenis } = req.query;

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const params = [];
    let sql = 'SELECT * FROM faskes WHERE latitude IS NOT NULL AND longitude IS NOT NULL';

    if (jenis) {
      params.push(jenis.toLowerCase());
      sql += ` AND jenis = $${params.length}`;
    }

    const { rows } = await query(sql, params);

    // Higher-order function: enrichWithDistance menambah field distance_km
    // dan memfilter berdasarkan radius, lalu sort terdekat ke terjauh
    const enriched = enrichWithDistance(rows, userLocation, parseFloat(radius));

    successResponse(
      res,
      `${enriched.length} faskes dalam radius ${radius} km ditemukan.`,
      enriched,
      200,
      { total: enriched.length, radius_km: parseFloat(radius), user_location: userLocation },
    );
  } catch (err) {
    next(err);
  }
};

/**
 * getAllJenis — GET /api/faskes/jenis
 * Mendapatkan daftar jenis faskes yang tersedia (untuk filter dropdown).
 */
const getAllJenis = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT DISTINCT jenis, COUNT(*) as jumlah FROM faskes GROUP BY jenis ORDER BY jenis',
    );
    successResponse(res, 'Jenis faskes berhasil diambil.', rows);
  } catch (err) {
    next(err);
  }
};

/**
 * getByDokterKriteria — GET /api/faskes/by-dokter?kriteria=umum&lat=&lng=&radius=
 * Faskes yang punya dokter jadwal matching kriteria spesialis, distance-sorted.
 */
const getByDokterKriteria = async (req, res, next) => {
  try {
    const { kriteria, lat, lng, radius = '10' } = req.query;
    
    if (!kriteria) {
      return clientErrorResponse(res, 'Parameter kriteria (spesialis) wajib.', 400);
    }

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const paramKriteria = `%${kriteria}%`;
    const { rows } = await query(`
      SELECT DISTINCT f.* 
      FROM faskes f
      JOIN jadwal_praktik jp ON f.id_faskes = jp.id_faskes
      JOIN dokter d ON jp.id_dokter = d.id_dokter
      WHERE f.latitude IS NOT NULL AND f.longitude IS NOT NULL
        AND d.spesialis ILIKE $1
      ORDER BY f.nama ASC
    `, [paramKriteria]);

    const enriched = enrichWithDistance(rows, userLocation, parseFloat(radius));

    successResponse(
      res,
      `${enriched.length} faskes dengan dokter ${kriteria} dalam radius ${radius} km.`,
      enriched,
      200,
      { 
        total: enriched.length, 
        kriteria,
        radius_km: parseFloat(radius), 
        user_location: userLocation 
      }
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getNearby, getAllJenis, getByDokterKriteria };
