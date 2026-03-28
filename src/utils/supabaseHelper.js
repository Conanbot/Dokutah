'use strict';

/**
 * src/utils/supabaseHelper.js
 * Helper functions untuk query Supabase dengan pattern yang familiar.
 * 
 * Konsep JS yang diterapkan:
 * - Async/Await error handling
 * - Destructuring dari Supabase responses
 * - Builder pattern untuk queries
 */

const { getSupabaseClient, createSupabaseAdminClient } = require('../config/supabase');

/**
 * Menjalankan SELECT query pada Supabase dengan filters.
 *
 * @param {string} table - nama tabel
 * @param {object} options - { columns, filters, orderBy, limit, offset }
 * @returns {Promise<{rows: Array, error: Error}>}
 *
 * @example
 * const { rows, error } = await supabaseQuery('dokter', {
 *   columns: '*',
 *   filters: [{ field: 'spesialis', op: 'ilike', value: '%Umum%' }],
 *   orderBy: { field: 'nama_dokter', ascending: true },
 *   limit: 10
 * });
 */
const supabaseQuery = async (table, options = {}) => {
  try {
    const supabase = getSupabaseClient();
    const {
      columns = '*',
      filters = [],
      orderBy = null,
      limit = null,
      offset = null,
    } = options;

    let query = supabase.from(table).select(columns);

    // Apply filters
    filters.forEach(({ field, op, value }) => {
      switch (op) {
        case 'eq':
          query = query.eq(field, value);
          break;
        case 'neq':
          query = query.neq(field, value);
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'like':
        case 'ilike':
          query = query.ilike(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        default:
          break;
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.field, { ascending: orderBy.ascending !== false });
    }

    // Apply limit
    if (limit) query = query.limit(limit);

    // Apply offset
    if (offset) query = query.range(offset, offset + (limit || 10) - 1);

    const { data, error } = await query;

    if (error) {
      return { rows: [], error };
    }

    return { rows: data || [], error: null };
  } catch (err) {
    return { rows: [], error: err };
  }
};

/**
 * Insert data ke Supabase table.
 *
 * @param {string} table - nama tabel
 * @param {object|array} data - data untuk insert
 * @param {boolean} useAdmin - gunakan admin client (bypass RLS)
 * @returns {Promise<{data: any, error: Error}>}
 *
 * @example
 * const { data, error } = await supabaseInsert('dokter', {
 *   nama_dokter: 'Dr. Budi',
 *   spesialis: 'Umum'
 * });
 */
const supabaseInsert = async (table, data, useAdmin = false) => {
  try {
    const supabase = useAdmin ? createSupabaseAdminClient() : getSupabaseClient();
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Update data di Supabase table.
 *
 * @param {string} table - nama tabel
 * @param {object} data - data untuk update
 * @param {array} filters - filter untuk WHERE clause
 * @param {boolean} useAdmin - gunakan admin client
 * @returns {Promise<{data: any, error: Error}>}
 *
 * @example
 * const { data, error } = await supabaseUpdate('dokter', 
 *   { rating: 4.5 },
 *   [{ field: 'id_dokter', op: 'eq', value: 1 }]
 * );
 */
const supabaseUpdate = async (table, data, filters = [], useAdmin = false) => {
  try {
    const supabase = useAdmin ? createSupabaseAdminClient() : getSupabaseClient();
    let query = supabase.from(table).update(data);

    // Apply filters
    filters.forEach(({ field, op, value }) => {
      if (op === 'eq') {
        query = query.eq(field, value);
      } else if (op === 'neq') {
        query = query.neq(field, value);
      }
    });

    const { data: result, error } = await query.select();

    if (error) {
      return { data: null, error };
    }

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Delete data dari Supabase table.
 *
 * @param {string} table - nama tabel
 * @param {array} filters - filter untuk WHERE clause
 * @param {boolean} useAdmin - gunakan admin client
 * @returns {Promise<{count: number, error: Error}>}
 *
 * @example
 * const { count, error } = await supabaseDelete('dokter',
 *   [{ field: 'id_dokter', op: 'eq', value: 1 }]
 * );
 */
const supabaseDelete = async (table, filters = [], useAdmin = false) => {
  try {
    const supabase = useAdmin ? createSupabaseAdminClient() : getSupabaseClient();
    let query = supabase.from(table).delete();

    // Apply filters
    filters.forEach(({ field, op, value }) => {
      if (op === 'eq') {
        query = query.eq(field, value);
      }
    });

    const { data, error, count } = await query;

    if (error) {
      return { count: 0, error };
    }

    return { count: data?.length || 0, error: null };
  } catch (err) {
    return { count: 0, error: err };
  }
};

module.exports = {
  supabaseQuery,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
};
