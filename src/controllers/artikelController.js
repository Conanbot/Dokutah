'use strict';

/**
 * src/controllers/artikelController.js
 */

const { getSupabaseClient }                              = require('../config/supabase');
const { successResponse, notFoundResponse,
        clientErrorResponse }                            = require('../utils/responseHelper');

const KATEGORI_VALID = Object.freeze([
  'umum', 'penyakit', 'gizi', 'ibu-anak', 'kesehatan-jiwa',
  'obat', 'tips', 'darurat', 'bpjs',
]);

const getAll = async (req, res, next) => {
  try {
    const { kategori, limit = '10', page = '1', search } = req.query;
    const supabase  = getSupabaseClient();
    const limitInt  = parseInt(limit, 10);
    const pageInt   = parseInt(page, 10);
    const offset    = (pageInt - 1) * limitInt;

    let q = supabase
      .from('artikel')
      .select('id_artikel, judul, ringkasan, kategori, gambar_url, penulis, created_at, slug', { count: 'exact' })
      .eq('aktif', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitInt - 1);

    if (kategori) q = q.eq('kategori', kategori.toLowerCase());
    if (search)   q = q.or(`judul.ilike.%${search}%,ringkasan.ilike.%${search}%`);

    const { data, error, count } = await q;
    if (error) throw error;

    successResponse(res, 'Artikel berhasil diambil.', data, 200, {
      total: count, page: pageInt, limit: limitInt,
      totalPage: Math.ceil(count / limitInt),
    });
  } catch (err) { next(err); }
};

const getBySlug = async (req, res, next) => {
  try {
    const { slug }  = req.params;
    const supabase  = getSupabaseClient();

    const { data, error } = await supabase
      .from('artikel')
      .select('*')
      .eq('slug', slug)
      .eq('aktif', true)
      .single();

    if (error || !data) return notFoundResponse(res, 'Artikel');
    successResponse(res, 'Artikel berhasil diambil.', data);
  } catch (err) { next(err); }
};

const getKategori = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('artikel').select('kategori').eq('aktif', true);

    if (error) throw error;

    const hitungan = data.reduce((acc, { kategori }) => {
      acc[kategori] = (acc[kategori] || 0) + 1;
      return acc;
    }, {});

    const result = Object.entries(hitungan)
      .map(([kategori, jumlah]) => ({ kategori, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    successResponse(res, 'Kategori berhasil diambil.', result);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { judul, konten, ringkasan, kategori, gambar_url, penulis } = req.body;
    const supabase = getSupabaseClient();

    if (!KATEGORI_VALID.includes(kategori?.toLowerCase())) {
      return clientErrorResponse(res, `Kategori tidak valid. Pilihan: ${KATEGORI_VALID.join(', ')}`, 400);
    }

    const slug = judul
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

    const { data, error } = await supabase
      .from('artikel')
      .insert({
        judul, konten,
        ringkasan:  ringkasan  || '',
        kategori:   kategori.toLowerCase(),
        gambar_url: gambar_url || null,
        penulis:    penulis    || 'Admin',
        slug, aktif: true,
      })
      .select('id_artikel, judul, kategori, slug, created_at')
      .single();

    if (error) throw error;
    successResponse(res, 'Artikel berhasil dibuat.', data, 201);
  } catch (err) { next(err); }
};

module.exports = { getAll, getBySlug, getKategori, create };
