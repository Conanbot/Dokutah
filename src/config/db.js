'use strict';

/**
 * src/config/db.js
 * Modul koneksi PostgreSQL menggunakan `pg` (node-postgres).
 *
 * Konsep JS yang diterapkan:
 * - Closure: Pool dibuat sekali dan "diingat" oleh fungsi getPool()
 * - Object.create(null): membuat cache objek tanpa prototype chain
 * - Async/Await: uji koneksi database saat startup
 * - Destructuring: dari process.env
 * - Arrow function: di semua fungsi pendek
 */

const fs = require('fs');
if (fs.existsSync('.env')) {
  require('dotenv').config();
}
const { Pool } = require('pg');

// ─── Closure: menyimpan satu instance Pool ────────────────────────────────────
// Pattern ini memastikan hanya ada SATU koneksi pool di seluruh aplikasi
// (Singleton via closure), tidak perlu require ulang berkali-kali.
let _pool = null;

/**
 * Membuat konfigurasi koneksi dari environment variables.
 * Dipisah agar mudah di-test dan dimodifikasi.
 *
 * @returns {object} konfigurasi pg.Pool
 */
const createPoolConfig = () => {
  const {
    DB_USER,
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_PORT = '5432',
    NODE_ENV = 'development',
  } = process.env;

  return {
    user:     DB_USER,
    host:     DB_HOST,
    database: DB_NAME,
    password: DB_PASSWORD,
    port:     parseInt(DB_PORT, 10),

    // Pengaturan pool koneksi
    max:             10,  // maksimum koneksi bersamaan
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,

    // SSL wajib di production (Railway, Render, dll)
    ssl: NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  };
};

/**
 * connectDB — menginisialisasi pool dan menguji koneksi ke database.
 * Dipanggil SEKALI saat server.js start.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const config = createPoolConfig();
  _pool = new Pool(config);

  // Uji koneksi dengan query sederhana
  const client = await _pool.connect();
  try {
    const { rows } = await client.query('SELECT NOW() as waktu');
    console.log(`[DB] Koneksi PostgreSQL berhasil — waktu server: ${rows[0].waktu}`);
  } finally {
    client.release(); // WAJIB: kembalikan client ke pool setelah dipakai
  }

  // Event listener untuk error koneksi yang tidak tertangani
  _pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });
};

/**
 * getPool — mengembalikan instance pool yang sudah dibuat.
 * Merupakan implementasi closure: akses `_pool` dari luar modul ini
 * hanya bisa melalui fungsi ini.
 *
 * @returns {Pool}
 * @throws {Error} jika connectDB belum dipanggil
 */
const getPool = () => {
  if (!_pool) {
    throw new Error('[DB] Pool belum diinisialisasi. Panggil connectDB() terlebih dahulu.');
  }
  return _pool;
};

/**
 * query — shorthand untuk menjalankan SQL query.
 * Higher-order approach: mengabstraksi penggunaan pool agar
 * controller tidak perlu tahu implementasi pool.
 *
 * @param {string} text - SQL query string (parameterized)
 * @param {Array}  params - parameter query untuk mencegah SQL Injection
 * @returns {Promise<QueryResult>}
 */
const query = (text, params) => getPool().query(text, params);

/**
 * withTransaction — menjalankan multiple query dalam satu transaksi.
 * Jika salah satu gagal, semua di-rollback.
 * Menggunakan Promise + callback pattern.
 *
 * @param {Function} callback - fungsi yang menerima client dan menjalankan queries
 * @returns {Promise<any>}
 *
 * @example
 * await withTransaction(async (client) => {
 *   await client.query('INSERT INTO ...');
 *   await client.query('UPDATE ...');
 * });
 */
const withTransaction = async (callback) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err; // lempar ulang agar tertangkap di error handler
  } finally {
    client.release();
  }
};

// Gunakan Object.create(null) untuk cache sederhana tanpa prototype chain
// Berguna misalnya untuk cache query stats (tidak punya __proto__, toString, dll)
const _queryCache = Object.create(null);

module.exports = { connectDB, getPool, query, withTransaction };
