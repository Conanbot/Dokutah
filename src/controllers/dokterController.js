'use strict';

/**
 * src/controllers/dokterController.js
 * Handler untuk semua operasi data dokter.
 * Menggunakan Supabase client — tidak ada koneksi PostgreSQL langsung.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await + try/catch
 * - Destructuring dari req.params, req.query
 * - Higher-order functions: map, filter, sort
 * - Arrow functions
 * - Closure: getSupabaseClient sebagai singleton
 */

const { getSupabaseClient }                              = require('../config/supabase');
const { successResponse, notFoundResponse }              = require('../utils/responseHelper');
const { enrichWithDistance, parseCoordinates }           = require('../utils/geoHelper');

/**
 * getAll — GET /api/dokter
 * Mendapatkan semua dokter, dengan optional filter spesialis/nama.
 */
const getAll = async (req, res, next) => {
  try {
    const { spesialis, nama } = req.query;
    const supabase = getSupabaseClient();

    let queryBuilder = supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, spesialis, no_hp, foto_url,
        latitude, longitude, alamat_praktik, terima_bpjs, rating,
        jadwal_praktik (hari, jam_mulai, jam_selesai, kuota_maksimal)
      `)
      .order('nama_dokter', { ascending: true });

    if (spesialis) queryBuilder = queryBuilder.ilike('spesialis', `%${spesialis}%`);
    if (nama)      queryBuilder = queryBuilder.ilike('nama_dokter', `%${nama}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;

    successResponse(res, `${data.length} dokter ditemukan.`, data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

/**
 * getById — GET /api/dokter/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('dokter')
      .select(`*, jadwal_praktik (id_jadwal, hari, jam_mulai, jam_selesai, kuota_maksimal)`)
      .eq('id_dokter', id)
      .single();

    if (error || !data) return notFoundResponse(res, 'Dokter');
    successResponse(res, 'Detail dokter berhasil diambil.', data);
  } catch (err) {
    next(err);
  }
};

/**
 * getBySpesialis — GET /api/dokter/spesialis/:jenis
 */
const getBySpesialis = async (req, res, next) => {
  try {
    const { jenis } = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('dokter')
      .select('*')
      .ilike('spesialis', `%${jenis}%`)
      .order('rating', { ascending: false, nullsFirst: false });

    if (error) throw error;
    successResponse(res, `Dokter spesialis ${jenis} ditemukan.`, data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

/**
 * getBpjsDokter — GET /api/dokter/bpjs?lat=&lng=
 * Dokter yang terima BPJS, spesialis umum/gigi, diurutkan jarak terdekat.
 */
const getBpjsDokter = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const userLocation = parseCoordinates(lat, lng);
    const supabase     = getSupabaseClient();

    const { data, error } = await supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, spesialis, no_hp, foto_url,
        latitude, longitude, alamat_praktik, terima_bpjs, rating,
        jadwal_praktik (hari, jam_mulai, jam_selesai, kuota_maksimal)
      `)
      .eq('terima_bpjs', true)
      .or('spesialis.ilike.%umum%,spesialis.ilike.%gigi%')
      .order('nama_dokter', { ascending: true });

    if (error) throw error;

    // Tambahkan jarak dan sort terdekat — Higher-order function
    let result = data;
    if (userLocation) {
      result = enrichWithDistance(data, userLocation);
      result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    successResponse(res, `${result.length} dokter BPJS ditemukan.`, result, 200, {
      total:         result.length,
      bpjs_filtered: true,
      user_location: userLocation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * getByFaskesKriteria — GET /api/dokter/by-faskes/:id_faskes?kriteria=&lat=&lng=
 * Dokter yang bertugas di faskes tertentu, filter spesialis, sort jarak.
 */
const getByFaskesKriteria = async (req, res, next) => {
  try {
    const { id_faskes }  = req.params;
    const { kriteria, lat, lng } = req.query;
    const userLocation   = parseCoordinates(lat, lng);
    const supabase       = getSupabaseClient();

    // Ambil id_dokter dari jadwal_praktik di faskes ini
    let jadwalQuery = supabase
      .from('jadwal_praktik')
      .select('id_dokter')
      .eq('id_faskes', id_faskes);

    const { data: jadwalData, error: jadwalErr } = await jadwalQuery;
    if (jadwalErr) throw jadwalErr;

    const idDokterList = [...new Set(jadwalData.map(j => j.id_dokter))];
    if (!idDokterList.length) return notFoundResponse(res, 'Dokter di faskes ini');

    // Ambil data dokter berdasarkan id list
    let dokterQuery = supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, spesialis, no_hp, foto_url,
        latitude, longitude, alamat_praktik, terima_bpjs, rating,
        jadwal_praktik (id_jadwal, hari, jam_mulai, jam_selesai, kuota_maksimal)
      `)
      .in('id_dokter', idDokterList)
      .order('nama_dokter', { ascending: true });

    if (kriteria) dokterQuery = dokterQuery.ilike('spesialis', `%${kriteria}%`);

    const { data, error } = await dokterQuery;
    if (error) throw error;

    let result = data;
    if (userLocation) {
      result = enrichWithDistance(data, userLocation);
      result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    if (!result.length) return notFoundResponse(res, 'Dokter di faskes ini');

    successResponse(res, 'Dokter di faskes ditemukan.', result, 200, {
      total:         result.length,
      faskes_id:     id_faskes,
      kriteria,
      user_location: userLocation,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getBySpesialis, getBpjsDokter, getByFaskesKriteria };
