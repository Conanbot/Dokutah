'use strict';

/**
 * src/controllers/pemesananController.js
 * Disesuaikan dengan schema Hans:
 *   - Tabel: pesanan, user (atau "users")
 *
 * Mapping:
 *   id_pemesanan  → id_pesanan
 *   nama_pasien   → dari tabel user (nama)
 *   no_hp         → dari tabel user (nomor_telepon)
 *   nomor_antrian → nomor_antrean
 *   id_jadwal     → diganti id_faskes / id_rumah_sakit
 *
 * ⚠️  KOLOM YANG PERLU DITAMBAHKAN HANS KE TABEL pesanan:
 *      id_jadwal_dokter INTEGER (FK ke jadwal_dokter) — agar booking by jadwal bisa jalan
 */

const { getSupabaseClient }                         = require('../config/supabase');
const { successResponse, notFoundResponse,
        clientErrorResponse }                        = require('../utils/responseHelper');

/**
 * create — POST /api/pemesanan
 * Body: { id_user, id_faskes, id_rumah_sakit, jenis_pesanan, tanggal_periksa, catatan }
 */
const create = async (req, res, next) => {
  try {
    const {
      id_user, id_faskes, id_rumah_sakit,
      jenis_pesanan, tanggal_periksa, catatan,
    } = req.body;

    if (!id_user) return clientErrorResponse(res, 'Parameter id_user wajib diisi.', 400);
    if (!id_faskes && !id_rumah_sakit) {
      return clientErrorResponse(res, 'Parameter id_faskes atau id_rumah_sakit wajib diisi.', 400);
    }

    const supabase = getSupabaseClient();

    // Hitung nomor antrian hari ini di faskes/RS yang sama
    let countQuery = supabase
      .from('pesanan')
      .select('*', { count: 'exact', head: true });

    if (id_faskes)       countQuery = countQuery.eq('id_faskes', id_faskes);
    if (id_rumah_sakit)  countQuery = countQuery.eq('id_rumah_sakit', id_rumah_sakit);
    if (tanggal_periksa) countQuery = countQuery.eq('tanggal_periksa', tanggal_periksa);

    const { count, error: countErr } = await countQuery;
    if (countErr) throw countErr;

    const nomorAntrean = (count || 0) + 1;

    const { data, error } = await supabase
      .from('pesanan')
      .insert({
        id_user,
        id_faskes:        id_faskes        || null,
        id_rumah_sakit:   id_rumah_sakit   || null,
        jenis_pesanan:    jenis_pesanan    || 'Umum',
        tanggal_periksa:  tanggal_periksa  || new Date().toISOString().split('T')[0],
        nomor_antrean:    nomorAntrean,
        status_antrean:   'menunggu',
        catatan:          catatan          || null,
      })
      .select()
      .single();

    if (error) throw error;

    successResponse(
      res,
      `Pendaftaran berhasil! Nomor antrian Anda: ${nomorAntrean}`,
      { pesanan: data, nomor_antrean: nomorAntrean },
      201,
    );
  } catch (err) { next(err); }
};

/**
 * getByJadwal — GET /api/pemesanan?id_jadwal=&id_faskes=&id_rumah_sakit=
 */
const getByJadwal = async (req, res, next) => {
  try {
    const { id_jadwal, id_faskes, id_rumah_sakit } = req.query;
    const supabase = getSupabaseClient();

    let q = supabase
      .from('pesanan')
      .select(`
        id_pesanan, jenis_pesanan, tanggal_periksa,
        nomor_antrean, status_antrean,
        id_faskes, id_rumah_sakit
      `)
      .order('nomor_antrean', { ascending: true });

    if (id_faskes)      q = q.eq('id_faskes', id_faskes);
    if (id_rumah_sakit) q = q.eq('id_rumah_sakit', id_rumah_sakit);

    const { data, error } = await q;
    if (error) throw error;

    // Normalise ke format lama agar frontend tidak perlu diubah
    const result = data.map(p => ({
      id_pemesanan:  p.id_pesanan,
      nomor_antrian: p.nomor_antrean,
      status:        p.status_antrean,
      jenis:         p.jenis_pesanan,
      tanggal:       p.tanggal_periksa,
      id_faskes:     p.id_faskes,
      id_rumah_sakit: p.id_rumah_sakit,
    }));

    successResponse(res, 'Data pemesanan berhasil diambil.', result, 200, { total: result.length });
  } catch (err) { next(err); }
};

/**
 * cancel — DELETE /api/pemesanan/:id
 */
const cancel = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('pesanan')
      .delete()
      .eq('id_pesanan', id)
      .select()
      .single();

    if (error || !data) return notFoundResponse(res, 'Pesanan');
    successResponse(res, 'Pesanan berhasil dibatalkan.', data);
  } catch (err) { next(err); }
};

module.exports = { create, getByJadwal, cancel };
