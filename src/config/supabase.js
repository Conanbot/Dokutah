'use strict';

/**
 * src/config/supabase.js
 * Inisialisasi Supabase client untuk REST API dan realtime features.
 *
 * Konsep JS yang diterapkan:
 * - Singleton: hanya satu instance client
 * - Lazy initialization: client dibuat saat pertama kali diakses
 * - Environment variables: dari .env atau Railway
 */

const fs = require('fs');
if (fs.existsSync('.env')) {
  require('dotenv').config();
}
const { createClient } = require('@supabase/supabase-js');

let _supabaseClient = null;

/**
 * Membuat Supabase client dengan credentials dari environment variables.
 *
 * @returns {SupabaseClient} instance Supabase client
 * @throws {Error} jika credentials tidak tersedia
 */
const createSupabaseClient = () => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env'
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

/**
 * Membuat Supabase admin client dengan service role key.
 * Gunakan untuk operasi di server yang memerlukan privilege tinggi.
 *
 * @returns {SupabaseClient} instance Supabase admin client
 * @throws {Error} jika credentials tidak tersedia
 */
const createSupabaseAdminClient = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing Supabase admin credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

/**
 * getSupabaseClient — mengembalikan instance client yang sudah dibuat.
 * Implementasi Singleton dengan lazy initialization.
 *
 * @returns {SupabaseClient}
 */
const getSupabaseClient = () => {
  if (!_supabaseClient) {
    _supabaseClient = createSupabaseClient();
    console.log('[Supabase] Client initialized successfully');
  }
  return _supabaseClient;
};

/**
 * connectSupabase — menginisialisasi client dan test koneksi.
 * Dipanggil SEKALI saat server.js start.
 *
 * @returns {Promise<void>}
 */
const connectSupabase = async () => {
  try {
    const client = getSupabaseClient();
    
    // Test koneksi dengan query sederhana
    const { data, error } = await client
      .from('dokter')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('[Supabase] Connection error:', error.message);
      throw error;
    }

    console.log('[Supabase] Koneksi berhasil — Supabase ready ✓');
  } catch (err) {
    console.error('[Supabase] Failed to connect:', err.message);
    throw err;
  }
};

module.exports = {
  getSupabaseClient,
  createSupabaseAdminClient,
  connectSupabase,
};
