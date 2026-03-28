'use strict';

/**
 * src/controllers/pemesananController.js
 * Handler untuk proses pemesanan / pendaftaran ke dokter.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await
 * - withTransaction: multiple query dalam satu DB transaction
 * - Destructuring
 * - Arrow functions
 * - Error handling dengan AppError
 */

const { query, withTransaction }                          = require('../config/db');
const { successResponse, notFoundResponse,
        clientErrorResponse }                             = require('../utils/responseHelper');
const { AppError }                                        = require('../middleware/errorHandler');

/**
 * create — POST /api/pemesanan
 * Membuat pemesanan baru dengan pengecekan kuota via DB transaction.
 *
 * Menggunakan withTransaction agar:
 * - Cek kuota dan insert pemesanan berjalan ATOMIK
 * - Jika insert gagal, cek kuota juga di-rollback (tidak ada data korup)
 */
const create = async (req, res, next) => {
  try {
    const { id_jadwal, nama_pasien, no_hp, catatan } = req.body; // Destructuring

    const result = await withTransaction(async (client) => {
      // 1. Lock baris jadwal agar tidak ada race condition (2 user pesan bersamaan)
      const { rows: jadwalRows } = await client.query(
        'SELECT kuota_maksimal FROM jadwal_praktik WHERE id_jadwal = $1 FOR UPDATE',
        [id_jadwal],
      );

      if (!jadwalRows.length) throw AppError('Jadwal tidak ditemukan.', 404);

      const { kuota_maksimal } = jadwalRows[0]; // Destructuring

      // 2. Hitung yang sudah terdaftar
      const { rows: hitungRows } = await client.query(
        'SELECT COUNT(*) AS total FROM pemesanan WHERE id_jadwal = $1',
        [id_jadwal],
      );
      const terisi = parseInt(hitungRows[0].total, 10);

      // 3. Cek kuota
      if (terisi >= kuota_maksimal) {
        throw AppError(`Maaf, kuota jadwal ini sudah penuh (${kuota_maksimal}/${kuota_maksimal}).`, 400);
      }

      // 4. Generate nomor antrian
      const nomorAntrian = terisi + 1;

      // 5. Insert pemesanan
      const { rows: newRows } = await client.query(
        `INSERT INTO pemesanan (id_jadwal, nama_pasien, no_hp, catatan, nomor_antrian, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [id_jadwal, nama_pasien.trim(), no_hp || null, catatan || null, nomorAntrian],
      );

      return { pemesanan: newRows[0], sisa_kuota: kuota_maksimal - nomorAntrian };
    });

    successResponse(
      res,
      `Pendaftaran berhasil! Nomor antrian Anda: ${result.pemesanan.nomor_antrian}`,
      result,
      201,
    );
  } catch (err) {
    // Jika err adalah AppError (operational), teruskan langsung
    // Jika tidak, bungkus sebagai server error
    next(err);
  }
};

/**
 * getByJadwal — GET /api/pemesanan?id_jadwal=...
 * Melihat daftar pemesanan untuk jadwal tertentu.
 */
const getByJadwal = async (req, res, next) => {
  try {
    const { id_jadwal } = req.query;

    if (!id_jadwal) {
      return clientErrorResponse(res, 'Parameter id_jadwal wajib diisi.', 400);
    }

    const { rows } = await query(
      `SELECT p.*, j.hari, j.jam_mulai, j.jam_selesai, d.nama_dokter
       FROM pemesanan p
       JOIN jadwal_praktik j ON p.id_jadwal = j.id_jadwal
       JOIN dokter d ON j.id_dokter = d.id_dokter
       WHERE p.id_jadwal = $1
       ORDER BY p.nomor_antrian ASC`,
      [id_jadwal],
    );

    successResponse(res, 'Data pemesanan berhasil diambil.', rows, 200, { total: rows.length });
  } catch (err) {
    next(err);
  }
};

/**
 * cancel — DELETE /api/pemesanan/:id
 * Membatalkan pemesanan berdasarkan ID.
 */
const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'DELETE FROM pemesanan WHERE id_pemesanan = $1 RETURNING *',
      [id],
    );

    if (!rows.length) return notFoundResponse(res, 'Pemesanan');

    successResponse(res, 'Pemesanan berhasil dibatalkan.', rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getByJadwal, cancel };
