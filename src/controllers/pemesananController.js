'use strict';

/**
 * src/controllers/pemesananController.js
 * Handler untuk proses pemesanan / pendaftaran ke dokter.
 * Menggunakan Supabase client — tidak ada koneksi PostgreSQL langsung.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await
 * - Destructuring
 * - Arrow functions
 * - Error handling
 */

const { getSupabaseClient }                              = require('../config/supabase');
const { successResponse, notFoundResponse,
        clientErrorResponse }                            = require('../utils/responseHelper');

/**
 * create — POST /api/pemesanan
 * Membuat pemesanan baru dengan pengecekan kuota.
 */
const create = async (req, res, next) => {
  try {
    const { id_jadwal, nama_pasien, no_hp, catatan } = req.body;
    const supabase = getSupabaseClient();

    // 1. Ambil data jadwal + kuota
    const { data: jadwal, error: jadwalErr } = await supabase
      .from('jadwal_praktik')
      .select('kuota_maksimal')
      .eq('id_jadwal', id_jadwal)
      .single();

    if (jadwalErr || !jadwal) {
      return clientErrorResponse(res, 'Jadwal tidak ditemukan.', 404);
    }

    // 2. Hitung yang sudah terdaftar
    const { count, error: countErr } = await supabase
      .from('pemesanan')
      .select('*', { count: 'exact', head: true })
      .eq('id_jadwal', id_jadwal);

    if (countErr) throw countErr;

    const terisi = count || 0;

    // 3. Cek kuota
    if (terisi >= jadwal.kuota_maksimal) {
      return clientErrorResponse(
        res,
        `Maaf, kuota jadwal ini sudah penuh (${jadwal.kuota_maksimal}/${jadwal.kuota_maksimal}).`,
        400,
      );
    }

    // 4. Insert pemesanan
    const nomorAntrian = terisi + 1;

    const { data: pemesanan, error: insertErr } = await supabase
      .from('pemesanan')
      .insert({
        id_jadwal,
        nama_pasien: nama_pasien.trim(),
        no_hp:       no_hp || null,
        catatan:     catatan || null,
        nomor_antrian: nomorAntrian,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    successResponse(
      res,
      `Pendaftaran berhasil! Nomor antrian Anda: ${nomorAntrian}`,
      { pemesanan, sisa_kuota: jadwal.kuota_maksimal - nomorAntrian },
      201,
    );
  } catch (err) {
    next(err);
  }
};

/**
 * getByJadwal — GET /api/pemesanan?id_jadwal=
 */
const getByJadwal = async (req, res, next) => {
  try {
    const { id_jadwal } = req.query;
    const supabase      = getSupabaseClient();

    if (!id_jadwal) {
      return clientErrorResponse(res, 'Parameter id_jadwal wajib diisi.', 400);
    }

    const { data, error } = await supabase
      .from('pemesanan')
      .select(`
        *,
        jadwal_praktik (hari, jam_mulai, jam_selesai, dokter (nama_dokter))
      `)
      .eq('id_jadwal', id_jadwal)
      .order('nomor_antrian', { ascending: true });

    if (error) throw error;
    successResponse(res, 'Data pemesanan berhasil diambil.', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

/**
 * cancel — DELETE /api/pemesanan/:id
 */
const cancel = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('pemesanan')
      .delete()
      .eq('id_pemesanan', id)
      .select()
      .single();

    if (error || !data) return notFoundResponse(res, 'Pemesanan');
    successResponse(res, 'Pemesanan berhasil dibatalkan.', data);
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getByJadwal, cancel };
