'use strict';

/**
 * src/controllers/artikelController.js
 * Handler untuk konten artikel kesehatan (CMS sederhana).
 *
 * Konsep JS yang diterapkan:
 * - Async/Await + try/catch
 * - Destructuring dari req.body, req.params, req.query
 * - Higher-order functions: map untuk format response
 * - Arrow functions
 */

const { query }                                          = require('../config/db');
const { successResponse, notFoundResponse,
        clientErrorResponse }                           = require('../utils/responseHelper');

// Kategori artikel yang diizinkan — Object.freeze agar tidak bisa diubah
const KATEGORI_VALID = Object.freeze([
  'umum', 'penyakit', 'gizi', 'ibu-anak', 'kesehatan-jiwa',
  'obat', 'tips', 'darurat', 'bpjs',
]);

/**
 * getAll — GET /api/artikel
 * Mendapatkan semua artikel, dengan filter opsional berdasarkan kategori.
 */
const getAll = async (req, res, next) => {
  try {
    const { kategori, limit = '10', page = '1', search } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    let sql = `
      SELECT id_artikel, judul, ringkasan, kategori, gambar_url,
             penulis, created_at, slug
      FROM artikel
      WHERE aktif = true
    `;

    if (kategori) {
      params.push(kategori.toLowerCase());
      conditions.push(`kategori = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(judul ILIKE $${params.length} OR ringkasan ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    // Total count untuk pagination
    const countSql = sql.replace(
      'SELECT id_artikel, judul, ringkasan, kategori, gambar_url, penulis, created_at, slug',
      'SELECT COUNT(*)',
    );
    const { rows: countRows } = await query(countSql, params);
    const total = parseInt(countRows[0].count, 10);

    // Tambah ORDER BY, LIMIT, OFFSET
    params.push(parseInt(limit, 10));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const { rows } = await query(sql, params);

    successResponse(res, 'Artikel berhasil diambil.', rows, 200, {
      total,
      page:      parseInt(page, 10),
      limit:     parseInt(limit, 10),
      totalPage: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getBySlug — GET /api/artikel/:slug
 * Mendapatkan satu artikel lengkap berdasarkan slug URL-friendly.
 */
const getBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { rows } = await query(
      'SELECT * FROM artikel WHERE slug = $1 AND aktif = true',
      [slug],
    );

    if (!rows.length) return notFoundResponse(res, 'Artikel');
    successResponse(res, 'Artikel berhasil diambil.', rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * getKategori — GET /api/artikel/kategori
 * Mengembalikan daftar kategori yang tersedia + jumlah artikel per kategori.
 */
const getKategori = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT kategori, COUNT(*) AS jumlah
       FROM artikel
       WHERE aktif = true
       GROUP BY kategori
       ORDER BY jumlah DESC`,
    );
    successResponse(res, 'Kategori berhasil diambil.', rows);
  } catch (err) {
    next(err);
  }
};

/**
 * create — POST /api/artikel
 * Membuat artikel baru (endpoint CMS — idealnya dilindungi auth di future).
 */
const create = async (req, res, next) => {
  try {
    const { judul, konten, ringkasan, kategori, gambar_url, penulis } = req.body;

    if (!KATEGORI_VALID.includes(kategori?.toLowerCase())) {
      return clientErrorResponse(
        res,
        `Kategori tidak valid. Pilihan: ${KATEGORI_VALID.join(', ')}`,
        400,
      );
    }

    // Buat slug dari judul: lowercase, spasi → strip, hapus karakter non-alphanumeric
    const slug = judul
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

    const { rows } = await query(
      `INSERT INTO artikel (judul, konten, ringkasan, kategori, gambar_url, penulis, slug, aktif, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
       RETURNING id_artikel, judul, kategori, slug, created_at`,
      [judul, konten, ringkasan || '', kategori.toLowerCase(), gambar_url || null, penulis || 'Admin', slug],
    );

    successResponse(res, 'Artikel berhasil dibuat.', rows[0], 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getBySlug, getKategori, create };
