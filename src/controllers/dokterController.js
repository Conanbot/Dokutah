'use strict';

/**
 * src/controllers/dokterController.js
 * Disesuaikan dengan schema Hans:
 *   - Tabel: dokter, jadwal_dokter, jenis_poli
 *
 * ⚠️  KOLOM YANG PERLU DITAMBAHKAN HANS KE TABEL dokter:
 *      spesialis VARCHAR(100), no_hp VARCHAR(20),
 *      latitude DECIMAL, longitude DECIMAL,
 *      terima_bpjs BOOLEAN DEFAULT false, rating DECIMAL(3,1)
 */

const { getSupabaseClient }                    = require('../config/supabase');
const { successResponse, notFoundResponse }    = require('../utils/responseHelper');
const { enrichWithDistance, parseCoordinates } = require('../utils/geoHelper');

// ─── Helper: normalise row ke format yg dipakai frontend ─────────────────────
const normaliseDokter = (d) => ({
  id_dokter:      d.id_dokter,
  nama_dokter:    d.nama_dokter,
  foto_url:       d.foto_profil_dokter || null,
  spesialis:      d.spesialis         || null,   // tambah kolom ini Hans
  no_hp:          d.no_hp             || null,   // tambah kolom ini Hans
  alamat_praktik: d.alamat_praktik    || null,   // tambah kolom ini Hans
  terima_bpjs:    d.terima_bpjs       ?? false,  // tambah kolom ini Hans
  rating:         d.rating            || null,   // tambah kolom ini Hans
  latitude:       d.latitude          || null,   // tambah kolom ini Hans
  longitude:      d.longitude         || null,   // tambah kolom ini Hans
  jadwal:         d.jadwal_dokter     || [],
});

/**
 * getAll — GET /api/dokter
 */
const getAll = async (req, res, next) => {
  try {
    const { spesialis, nama } = req.query;
    const supabase = getSupabaseClient();

    let q = supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, foto_profil_dokter,
        spesialis, no_hp, alamat_praktik, terima_bpjs, rating,
        latitude, longitude,
        jadwal_dokter (
          id_jadwal_dokter, jadwal_praktik,
          jam_periksa_buka, jam_periksa_tutup,
          jenis_poli ( id_poli, nama_poli )
        )
      `)
      .order('nama_dokter', { ascending: true });

    if (spesialis) q = q.ilike('spesialis', `%${spesialis}%`);
    if (nama)      q = q.ilike('nama_dokter', `%${nama}%`);

    const { data, error } = await q;
    if (error) throw error;

    const result = data.map(normaliseDokter);
    successResponse(res, `${result.length} dokter ditemukan.`, result, 200, { total: result.length });
  } catch (err) { next(err); }
};

/**
 * getById — GET /api/dokter/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, foto_profil_dokter,
        spesialis, no_hp, alamat_praktik, terima_bpjs, rating,
        latitude, longitude,
        jadwal_dokter (
          id_jadwal_dokter, jadwal_praktik,
          jam_periksa_buka, jam_periksa_tutup,
          jenis_poli ( id_poli, nama_poli )
        )
      `)
      .eq('id_dokter', id)
      .single();

    if (error || !data) return notFoundResponse(res, 'Dokter');
    successResponse(res, 'Detail dokter berhasil diambil.', normaliseDokter(data));
  } catch (err) { next(err); }
};

/**
 * getBySpesialis — GET /api/dokter/spesialis/:jenis
 */
const getBySpesialis = async (req, res, next) => {
  try {
    const { jenis } = req.params;
    const supabase  = getSupabaseClient();

    const { data, error } = await supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, foto_profil_dokter,
        spesialis, no_hp, terima_bpjs, rating, latitude, longitude
      `)
      .ilike('spesialis', `%${jenis}%`)
      .order('rating', { ascending: false, nullsFirst: false });

    if (error) throw error;
    successResponse(res, `Dokter spesialis ${jenis} ditemukan.`, data.map(normaliseDokter), 200, { total: data.length });
  } catch (err) { next(err); }
};

/**
 * getBpjsDokter — GET /api/dokter/bpjs?lat=&lng=
 * Filter dokter yang terima_bpjs = true (butuh kolom terima_bpjs di tabel dokter)
 */
const getBpjsDokter = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const userLocation = parseCoordinates(lat, lng);
    const supabase     = getSupabaseClient();

    const { data, error } = await supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, foto_profil_dokter,
        spesialis, no_hp, terima_bpjs, rating, latitude, longitude,
        jadwal_dokter (
          id_jadwal_dokter, jadwal_praktik,
          jam_periksa_buka, jam_periksa_tutup
        )
      `)
      .eq('terima_bpjs', true)
      .or('spesialis.ilike.%umum%,spesialis.ilike.%gigi%')
      .order('nama_dokter', { ascending: true });

    if (error) throw error;

    let result = data.map(normaliseDokter);
    if (userLocation) {
      result = enrichWithDistance(result, userLocation);
      result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    successResponse(res, `${result.length} dokter BPJS ditemukan.`, result, 200, {
      total: result.length, bpjs_filtered: true, user_location: userLocation,
    });
  } catch (err) { next(err); }
};

/**
 * getByFaskesKriteria — GET /api/dokter/by-faskes/:id_faskes?kriteria=&lat=&lng=
 * Dokter yang punya jadwal di faskes tertentu (via jadwal_dokter → jenis_poli → faskes)
 */
const getByFaskesKriteria = async (req, res, next) => {
  try {
    const { id_faskes }          = req.params;
    const { kriteria, lat, lng } = req.query;
    const userLocation           = parseCoordinates(lat, lng);
    const supabase               = getSupabaseClient();

    // Cari id_poli yang ada di faskes ini via jenis_poli
    const { data: poliData, error: poliErr } = await supabase
      .from('jenis_poli')
      .select('id_poli')
      .eq('fasilitas_kesehatan_id_faskes', id_faskes);

    if (poliErr) throw poliErr;
    if (!poliData.length) return notFoundResponse(res, 'Dokter di faskes ini');

    const idPoliList = poliData.map(p => p.id_poli);

    // Cari jadwal_dokter di poli tersebut
    const { data: jadwalData, error: jadwalErr } = await supabase
      .from('jadwal_dokter')
      .select('dokter_id_dokter')
      .in('jenis_poli_id_poli', idPoliList);

    if (jadwalErr) throw jadwalErr;
    const idDokterList = [...new Set(jadwalData.map(j => j.dokter_id_dokter))];
    if (!idDokterList.length) return notFoundResponse(res, 'Dokter di faskes ini');

    let dokterQuery = supabase
      .from('dokter')
      .select(`
        id_dokter, nama_dokter, foto_profil_dokter,
        spesialis, no_hp, terima_bpjs, rating, latitude, longitude,
        jadwal_dokter (
          id_jadwal_dokter, jadwal_praktik,
          jam_periksa_buka, jam_periksa_tutup
        )
      `)
      .in('id_dokter', idDokterList)
      .order('nama_dokter', { ascending: true });

    if (kriteria) dokterQuery = dokterQuery.ilike('spesialis', `%${kriteria}%`);

    const { data, error } = await dokterQuery;
    if (error) throw error;

    let result = data.map(normaliseDokter);
    if (userLocation) {
      result = enrichWithDistance(result, userLocation);
      result.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    if (!result.length) return notFoundResponse(res, 'Dokter di faskes ini');
    successResponse(res, 'Dokter di faskes ditemukan.', result, 200, {
      total: result.length, faskes_id: id_faskes, kriteria, user_location: userLocation,
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getBySpesialis, getBpjsDokter, getByFaskesKriteria };
