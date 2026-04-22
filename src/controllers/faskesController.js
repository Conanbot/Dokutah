'use strict';

/**
 * src/controllers/faskesController.js
 * Disesuaikan dengan schema Hans:
 *   - Tabel utama: fasilitas_kesehatan, rumah_sakit
 *
 * ⚠️  CATATAN SCHEMA HANS:
 *   - Kolom latitude di ERD Hans typo: "lattitude" (2 huruf t)
 *   - Kolom jenis tidak ada — ditambahkan otomatis dari nama tabel
 *   - Gunakan kolom "lattitude" jika Hans tidak rename, atau "latitude" jika sudah difix
 */

const { getSupabaseClient }                    = require('../config/supabase');
const { successResponse, notFoundResponse,
        clientErrorResponse }                  = require('../utils/responseHelper');
const { enrichWithDistance, parseCoordinates } = require('../utils/geoHelper');

// Normalise faskes row ke format standar
const normaliseFaskes = (row, jenis) => ({
  id_faskes:   row.id_faskes      || row.id_rumah_sakit,
  nama:        row.nama_faskes    || row.nama,
  alamat:      row.alamat,
  jenis:       jenis,
  terima_bpjs: row.terima_bpjs === true || row.terima_bpjs === 'Y' || row.terima_bpjs === '1',
  latitude:    row.lattitude      || row.latitude  || null,  // handle typo Hans
  longitude:   row.longitude      || null,
  jam_buka:    row.jam_buka       || null,
  jam_tutup:   row.jam_tutup      || null,
});

/**
 * getAll — GET /api/faskes?jenis=
 * Ambil dari kedua tabel: fasilitas_kesehatan + rumah_sakit
 */
const getAll = async (req, res, next) => {
  try {
    const { jenis } = req.query;
    const supabase  = getSupabaseClient();

    let result = [];

    if (!jenis || jenis === 'faskes' || jenis === 'puskesmas' || jenis === 'klinik') {
      const { data, error } = await supabase
        .from('fasilitas_kesehatan')
        .select('id_faskes, nama_faskes, alamat, terima_bpjs, lattitude, longitude')
        .order('nama_faskes', { ascending: true });
      if (error) throw error;
      result = [...result, ...data.map(r => normaliseFaskes(r, 'faskes'))];
    }

    if (!jenis || jenis === 'rs') {
      const { data, error } = await supabase
        .from('rumah_sakit')
        .select('id_rumah_sakit, nama, alamat, terima_bpjs, lattitude, longitude')
        .order('nama', { ascending: true });
      if (error) throw error;
      result = [...result, ...data.map(r => normaliseFaskes(r, 'rs'))];
    }

    successResponse(res, 'Data faskes berhasil diambil.', result, 200, { total: result.length });
  } catch (err) { next(err); }
};

/**
 * getById — GET /api/faskes/:id
 * Cek fasilitas_kesehatan dulu, lalu rumah_sakit
 */
const getById = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data: faskes } = await supabase
      .from('fasilitas_kesehatan')
      .select('*')
      .eq('id_faskes', id)
      .single();

    if (faskes) return successResponse(res, 'Detail faskes berhasil diambil.', normaliseFaskes(faskes, 'faskes'));

    const { data: rs, error } = await supabase
      .from('rumah_sakit')
      .select('*')
      .eq('id_rumah_sakit', id)
      .single();

    if (error || !rs) return notFoundResponse(res, 'Fasilitas Kesehatan');
    successResponse(res, 'Detail faskes berhasil diambil.', normaliseFaskes(rs, 'rs'));
  } catch (err) { next(err); }
};

/**
 * getNearby — GET /api/faskes/nearby?lat=&lng=&radius=&jenis=
 */
const getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = '10', jenis } = req.query;
    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);

    const supabase = getSupabaseClient();
    let allData    = [];

    if (!jenis || jenis !== 'rs') {
      const { data, error } = await supabase
        .from('fasilitas_kesehatan')
        .select('id_faskes, nama_faskes, alamat, terima_bpjs, lattitude, longitude')
        .not('lattitude', 'is', null);
      if (!error) allData = [...allData, ...data.map(r => normaliseFaskes(r, 'faskes'))];
    }

    if (!jenis || jenis === 'rs') {
      const { data, error } = await supabase
        .from('rumah_sakit')
        .select('id_rumah_sakit, nama, alamat, terima_bpjs, lattitude, longitude')
        .not('lattitude', 'is', null);
      if (!error) allData = [...allData, ...data.map(r => normaliseFaskes(r, 'rs'))];
    }

    const enriched = enrichWithDistance(allData, userLocation, parseFloat(radius));
    successResponse(res, `${enriched.length} faskes dalam radius ${radius} km ditemukan.`, enriched, 200, {
      total: enriched.length, radius_km: parseFloat(radius), user_location: userLocation,
    });
  } catch (err) { next(err); }
};

/**
 * getAllJenis — GET /api/faskes/jenis
 */
const getAllJenis = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();

    const [{ count: countFaskes }, { count: countRs }] = await Promise.all([
      supabase.from('fasilitas_kesehatan').select('*', { count: 'exact', head: true }),
      supabase.from('rumah_sakit').select('*', { count: 'exact', head: true }),
    ]);

    const result = [
      { jenis: 'faskes', jumlah: countFaskes || 0 },
      { jenis: 'rs',     jumlah: countRs     || 0 },
    ];

    successResponse(res, 'Jenis faskes berhasil diambil.', result);
  } catch (err) { next(err); }
};

/**
 * getByDokterKriteria — GET /api/faskes/by-dokter?kriteria=&lat=&lng=&radius=
 */
const getByDokterKriteria = async (req, res, next) => {
  try {
    const { kriteria, lat, lng, radius = '10' } = req.query;
    if (!kriteria) return clientErrorResponse(res, 'Parameter kriteria wajib.', 400);

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);

    const supabase = getSupabaseClient();

    // Cari dokter sesuai spesialis
    const { data: dokterData, error: dokterErr } = await supabase
      .from('dokter')
      .select('id_dokter')
      .ilike('spesialis', `%${kriteria}%`);

    if (dokterErr) throw dokterErr;
    if (!dokterData.length) return successResponse(res, `Tidak ada dokter ${kriteria}.`, [], 200, { total: 0 });

    const idDokterList = dokterData.map(d => d.id_dokter);

    // Cari jadwal_dokter dokter tersebut untuk dapat id_poli
    const { data: jadwalData, error: jadwalErr } = await supabase
      .from('jadwal_dokter')
      .select('jenis_poli_id_poli')
      .in('dokter_id_dokter', idDokterList);

    if (jadwalErr) throw jadwalErr;
    const idPoliList = [...new Set(jadwalData.map(j => j.jenis_poli_id_poli))];
    if (!idPoliList.length) return successResponse(res, `Tidak ada faskes dengan dokter ${kriteria}.`, [], 200, { total: 0 });

    // Cari faskes yang punya poli tersebut
    const { data: poliData, error: poliErr } = await supabase
      .from('jenis_poli')
      .select('fasilitas_kesehatan_id_faskes')
      .in('id_poli', idPoliList)
      .not('fasilitas_kesehatan_id_faskes', 'is', null);

    if (poliErr) throw poliErr;
    const idFaskesList = [...new Set(poliData.map(p => p.fasilitas_kesehatan_id_faskes))];

    const { data: faskesData, error: faskesErr } = await supabase
      .from('fasilitas_kesehatan')
      .select('id_faskes, nama_faskes, alamat, terima_bpjs, lattitude, longitude')
      .in('id_faskes', idFaskesList)
      .not('lattitude', 'is', null);

    if (faskesErr) throw faskesErr;

    const normalised = faskesData.map(r => normaliseFaskes(r, 'faskes'));
    const enriched   = enrichWithDistance(normalised, userLocation, parseFloat(radius));

    successResponse(res, `${enriched.length} faskes dengan dokter ${kriteria}.`, enriched, 200, {
      total: enriched.length, kriteria, radius_km: parseFloat(radius), user_location: userLocation,
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getNearby, getAllJenis, getByDokterKriteria };
