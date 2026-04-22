'use strict';

/**
 * src/controllers/jadwalController.js
 * Disesuaikan dengan schema Hans:
 *   - Tabel: jadwal_dokter, dokter, jenis_poli
 *
 * Mapping kolom:
 *   id_jadwal      → id_jadwal_dokter
 *   hari           → jadwal_praktik  (Hans simpan hari sebagai string di sini)
 *   jam_mulai      → jam_periksa_buka
 *   jam_selesai    → jam_periksa_tutup
 *   kuota_maksimal → tidak ada di ERD Hans (return null)
 */

const { getSupabaseClient }             = require('../config/supabase');
const { successResponse, notFoundResponse } = require('../utils/responseHelper');

// Normalise ke format yang dipakai frontend
const normaliseJadwal = (j) => ({
  id_jadwal:      j.id_jadwal_dokter,
  hari:           j.jadwal_praktik   || null,
  jam_mulai:      j.jam_periksa_buka  || null,
  jam_selesai:    j.jam_periksa_tutup || null,
  kuota_maksimal: j.kuota_maksimal    || null,  // tambah kolom ini Hans jika diperlukan
  dokter: j.dokter ? {
    id_dokter:   j.dokter.id_dokter,
    nama_dokter: j.dokter.nama_dokter,
    spesialis:   j.dokter.spesialis || null,
  } : null,
  poli: j.jenis_poli ? {
    id_poli:   j.jenis_poli.id_poli,
    nama_poli: j.jenis_poli.nama_poli,
  } : null,
});

/**
 * getAll — GET /api/jadwal?id_dokter=
 */
const getAll = async (req, res, next) => {
  try {
    const { id_dokter } = req.query;
    const supabase      = getSupabaseClient();

    let q = supabase
      .from('jadwal_dokter')
      .select(`
        id_jadwal_dokter, jadwal_praktik,
        jam_periksa_buka, jam_periksa_tutup,
        dokter ( id_dokter, nama_dokter, spesialis ),
        jenis_poli ( id_poli, nama_poli )
      `);

    if (id_dokter) q = q.eq('dokter_id_dokter', id_dokter);

    const { data, error } = await q;
    if (error) throw error;

    const result = data.map(normaliseJadwal);
    successResponse(res, 'Jadwal berhasil diambil.', result, 200, { total: result.length });
  } catch (err) { next(err); }
};

/**
 * getById — GET /api/jadwal/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('jadwal_dokter')
      .select(`
        id_jadwal_dokter, jadwal_praktik,
        jam_periksa_buka, jam_periksa_tutup,
        dokter ( id_dokter, nama_dokter, spesialis ),
        jenis_poli ( id_poli, nama_poli )
      `)
      .eq('id_jadwal_dokter', id)
      .single();

    if (error || !data) return notFoundResponse(res, 'Jadwal');
    successResponse(res, 'Detail jadwal berhasil diambil.', normaliseJadwal(data));
  } catch (err) { next(err); }
};

module.exports = { getAll, getById };
