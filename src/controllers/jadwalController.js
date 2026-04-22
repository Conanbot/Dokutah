'use strict';

/**
 * src/controllers/jadwalController.js
 * Handler untuk data jadwal praktik dokter.
 * Menggunakan Supabase client — tidak ada koneksi PostgreSQL langsung.
 */

const { getSupabaseClient }                              = require('../config/supabase');
const { successResponse, notFoundResponse }              = require('../utils/responseHelper');

const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * getAll — GET /api/jadwal
 */
const getAll = async (req, res, next) => {
  try {
    const { id_dokter } = req.query;
    const supabase      = getSupabaseClient();

    let queryBuilder = supabase
      .from('jadwal_praktik')
      .select(`
        id_jadwal, hari, jam_mulai, jam_selesai, kuota_maksimal,
        dokter (id_dokter, nama_dokter, spesialis)
      `);

    if (id_dokter) queryBuilder = queryBuilder.eq('id_dokter', id_dokter);

    const { data, error } = await queryBuilder;
    if (error) throw error;

    // Sort berdasarkan urutan hari — Higher-order function
    const sorted = data.sort((a, b) => {
      const idxA = URUTAN_HARI.indexOf(a.hari);
      const idxB = URUTAN_HARI.indexOf(b.hari);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    successResponse(res, 'Jadwal berhasil diambil.', sorted, 200, { total: sorted.length });
  } catch (err) {
    next(err);
  }
};

/**
 * getById — GET /api/jadwal/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('jadwal_praktik')
      .select(`
        *, dokter (nama_dokter, spesialis)
      `)
      .eq('id_jadwal', id)
      .single();

    if (error || !data) return notFoundResponse(res, 'Jadwal');

    successResponse(res, 'Detail jadwal berhasil diambil.', data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById };
