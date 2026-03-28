'use strict';

/**
 * src/config/env.js
 * Memvalidasi bahwa semua environment variable yang WAJIB ada sudah tersedia.
 *
 * Konsep JS yang diterapkan:
 * - Destructuring dari process.env
 * - Array + Higher-Order Function (filter, map)
 * - Closure: createEnvValidator menyimpan referensi ke `requiredVars`
 */

// Daftar env variable yang wajib ada agar aplikasi bisa berjalan
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_MAPS_API_KEY',
];

// Database variables (optional if using Supabase)
// Uncomment if you want to keep direct PostgreSQL connection alongside Supabase
// const DB_VARS = [
//   'DB_USER',
//   'DB_HOST',
//   'DB_NAME',
//   'DB_PASSWORD',
//   'DB_PORT',
// ];

// OPTIONAL: hanya dibaca jika ada, tidak akan menyebabkan crash
const OPTIONAL_VARS = [
  'PORT',
  'CORS_ORIGIN',
  'NODE_ENV',
];

/**
 * Closure Factory: membuat fungsi validator yang "mengingat" daftar variabel wajib.
 * Ini adalah contoh penggunaan closure — fungsi dalam mengakses variabel luar.
 *
 * @param {string[]} required - daftar nama env variable yang wajib ada
 * @returns {Function} fungsi validateEnv
 */
const createEnvValidator = (required) => {
  return () => {
    // Higher-order function: filter + map untuk cari yang kosong
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.error('\n❌ [ENV] Environment variable berikut belum diisi di file .env:');
      missing.forEach((key) => console.error(`   - ${key}`));
      console.error('\n👉 Salin .env.example menjadi .env lalu isi nilainya.\n');
      process.exit(1); // hentikan proses jika env tidak lengkap
    }

    // Destructuring dari process.env untuk tampilkan info startup
    const { NODE_ENV = 'development', PORT = '3000' } = process.env;
    console.log(`\n[ENV] Mode                    : ${NODE_ENV}`);
    console.log(`[ENV] Port                    : ${PORT}`);
    console.log(`[ENV] Supabase URL            : ${process.env.SUPABASE_URL}`);
    console.log('[ENV] Semua environment variable berhasil divalidasi ✅\n');
  };
};

const validateEnv = createEnvValidator(REQUIRED_VARS);

module.exports = { validateEnv, REQUIRED_VARS, OPTIONAL_VARS };
