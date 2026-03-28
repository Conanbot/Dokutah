'use strict';

/**
 * Example: Refactored dokterController using Supabase
 * 
 * BEFORE: using require('../config/db').query
 * AFTER: using supabaseHelper
 * 
 * Copy this pattern to update your existing controllers.
 */

const { supabaseQuery, supabaseInsert, supabaseUpdate, supabaseDelete } = require('../utils/supabaseHelper');
const { successResponse, notFoundResponse } = require('../utils/responseHelper');
const { AppError } = require('../middleware/errorHandler');

/**
 * getAll — GET /api/dokter
 * Mendapatkan semua dokter dengan optional filter
 */
const getAll = async (req, res, next) => {
  try {
    const { spesialis, nama, limit = 20, offset = 0 } = req.query;

    // Build filters
    const filters = [];
    if (spesialis) {
      filters.push({
        field: 'spesialis',
        op: 'ilike',
        value: `%${spesialis}%`,
      });
    }
    if (nama) {
      filters.push({
        field: 'nama_dokter',
        op: 'ilike',
        value: `%${nama}%`,
      });
    }

    // Query with filters
    const { rows: dokterList, error } = await supabaseQuery('dokter', {
      columns: `
        id_dokter, 
        nama_dokter, 
        spesialis, 
        no_hp, 
        foto_url,
        latitude, 
        longitude, 
        alamat_praktik,
        terima_bpjs, 
        rating
      `,
      filters,
      orderBy: { field: 'nama_dokter', ascending: true },
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (error) {
      throw new AppError('Gagal mengambil data dokter', 500);
    }

    return successResponse(res, 'Data dokter berhasil diambil', dokterList);
  } catch (err) {
    next(err);
  }
};

/**
 * getById — GET /api/dokter/:id
 * Mendapatkan data dokter berdasarkan ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: dokterList, error } = await supabaseQuery('dokter', {
      filters: [{ field: 'id_dokter', op: 'eq', value: parseInt(id) }],
    });

    if (error || dokterList.length === 0) {
      return notFoundResponse(res, 'Dokter tidak ditemukan');
    }

    return successResponse(res, 'Data dokter berhasil diambil', dokterList[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * create — POST /api/dokter
 * Membuat dokter baru
 */
const create = async (req, res, next) => {
  try {
    const { nama_dokter, spesialis, no_hp, alamat_praktik, terima_bpjs } = req.body;

    // Validate input
    if (!nama_dokter || !spesialis) {
      throw new AppError('nama_dokter dan spesialis wajib diisi', 400);
    }

    const { data: result, error } = await supabaseInsert('dokter', {
      nama_dokter,
      spesialis,
      no_hp,
      alamat_praktik,
      terima_bpjs: terima_bpjs === true || terima_bpjs === 'true',
      rating: 0,
    });

    if (error) {
      throw new AppError('Gagal membuat dokter', 500);
    }

    return successResponse(res, 'Dokter berhasil dibuat', result[0], 201);
  } catch (err) {
    next(err);
  }
};

/**
 * update — PUT /api/dokter/:id
 * Update dokter berdasarkan ID
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data: result, error } = await supabaseUpdate(
      'dokter',
      updateData,
      [{ field: 'id_dokter', op: 'eq', value: parseInt(id) }]
    );

    if (error || result.length === 0) {
      return notFoundResponse(res, 'Dokter tidak ditemukan atau gagal diupdate');
    }

    return successResponse(res, 'Dokter berhasil diupdate', result[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * delete — DELETE /api/dokter/:id
 * Hapus dokter berdasarkan ID
 */
const deleteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { count, error } = await supabaseDelete('dokter', [
      { field: 'id_dokter', op: 'eq', value: parseInt(id) },
    ]);

    if (error || count === 0) {
      return notFoundResponse(res, 'Dokter tidak ditemukan');
    }

    return successResponse(res, 'Dokter berhasil dihapus', { deleted: count });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteById,
};
