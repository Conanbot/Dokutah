'use strict';

/**
 * src/controllers/faskesController.js
 * Handler untuk data fasilitas kesehatan (puskesmas, klinik, RS, apotek).
 * Menggunakan Supabase client — tidak ada koneksi PostgreSQL langsung.
 *
 * Konsep JS yang diterapkan:
 * - Async/Await
 * - Destructuring
 * - Higher-order functions: enrichWithDistance, reduce
 * - Arrow functions
 */

const { getSupabaseClient }                              = require('../config/supabase');
const { successResponse, notFoundResponse,
        clientErrorResponse }                            = require('../utils/responseHelper');
const { enrichWithDistance, parseCoordinates }           = require('../utils/geoHelper');

/**
 * getAll — GET /api/faskes
 */
const getAll = async (req, res, next) => {
  try {
    const { jenis } = req.query;
    const supabase  = getSupabaseClient();

    let queryBuilder = supabase
      .from('faskes')
      .select('*')
      .order('nama', { ascending: true });

    if (jenis) queryBuilder = queryBuilder.eq('jenis', jenis.toLowerCase());

    const { data, error } = await queryBuilder;
    if (error) throw error;

    successResponse(res, 'Data faskes berhasil diambil.', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

/**
 * getById — GET /api/faskes/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('faskes')
      .select('*')
      .eq('id_faskes', id)
      .single();

    if (error || !data) return notFoundResponse(res, 'Fasilitas Kesehatan');
    successResponse(res, 'Detail faskes berhasil diambil.', data);
  } catch (err) {
    next(err);
  }
};

/**
 * getNearby — GET /api/faskes/nearby?lat=&lng=&radius=&jenis=
 * Faskes terdekat berdasarkan koordinat, menggunakan Haversine (geoHelper).
 */
const getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = '10', jenis } = req.query;

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const supabase = getSupabaseClient();

    let queryBuilder = supabase
      .from('faskes')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (jenis) queryBuilder = queryBuilder.eq('jenis', jenis.toLowerCase());

    const { data, error } = await queryBuilder;
    if (error) throw error;

    const enriched = enrichWithDistance(data, userLocation, parseFloat(radius));

    successResponse(
      res,
      `${enriched.length} faskes dalam radius ${radius} km ditemukan.`,
      enriched,
      200,
      { total: enriched.length, radius_km: parseFloat(radius), user_location: userLocation },
    );
  } catch (err) {
    next(err);
  }
};

/**
 * getAllJenis — GET /api/faskes/jenis
 * Daftar jenis faskes yang tersedia + jumlah.
 */
const getAllJenis = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('faskes')
      .select('jenis');

    if (error) throw error;

    // Hitung jumlah per jenis — Higher-order function (reduce)
    const hitungan = data.reduce((acc, { jenis }) => {
      acc[jenis] = (acc[jenis] || 0) + 1;
      return acc;
    }, {});

    const result = Object.entries(hitungan)
      .map(([jenis, jumlah]) => ({ jenis, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    successResponse(res, 'Jenis faskes berhasil diambil.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * getByDokterKriteria — GET /api/faskes/by-dokter?kriteria=&lat=&lng=&radius=
 * Faskes yang punya dokter sesuai spesialis, sort jarak terdekat.
 */
const getByDokterKriteria = async (req, res, next) => {
  try {
    const { kriteria, lat, lng, radius = '10' } = req.query;

    if (!kriteria) {
      return clientErrorResponse(res, 'Parameter kriteria (spesialis) wajib.', 400);
    }

    const userLocation = parseCoordinates(lat, lng);
    if (!userLocation) {
      return clientErrorResponse(res, 'Parameter lat dan lng tidak valid.', 400);
    }

    const supabase = getSupabaseClient();

    // Cari dokter yang sesuai kriteria spesialis dulu
    const { data: dokterData, error: dokterErr } = await supabase
      .from('dokter')
      .select('id_dokter')
      .ilike('spesialis', `%${kriteria}%`);

    if (dokterErr) throw dokterErr;

    const idDokterList = dokterData.map(d => d.id_dokter);
    if (!idDokterList.length) {
      return successResponse(res, `Tidak ada dokter ${kriteria} ditemukan.`, [], 200, { total: 0 });
    }

    // Cari faskes yang punya jadwal dokter tersebut
    const { data: jadwalData, error: jadwalErr } = await supabase
      .from('jadwal_praktik')
      .select('id_faskes')
      .in('id_dokter', idDokterList)
      .not('id_faskes', 'is', null);

    if (jadwalErr) throw jadwalErr;

    const idFaskesList = [...new Set(jadwalData.map(j => j.id_faskes))];
    if (!idFaskesList.length) {
      return successResponse(res, `Tidak ada faskes dengan dokter ${kriteria}.`, [], 200, { total: 0 });
    }

    // Ambil data faskes
    const { data: faskesData, error: faskesErr } = await supabase
      .from('faskes')
      .select('*')
      .in('id_faskes', idFaskesList)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (faskesErr) throw faskesErr;

    const enriched = enrichWithDistance(faskesData, userLocation, parseFloat(radius));

    successResponse(
      res,
      `${enriched.length} faskes dengan dokter ${kriteria} dalam radius ${radius} km.`,
      enriched,
      200,
      { total: enriched.length, kriteria, radius_km: parseFloat(radius), user_location: userLocation },
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getNearby, getAllJenis, getByDokterKriteria };
