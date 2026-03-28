'use strict';

/**
 * src/utils/responseHelper.js
 * Utility untuk membuat response JSON yang konsisten di seluruh API.
 *
 * Konsep JS yang diterapkan:
 * - Object.create: membuat response object dari prototype
 * - Arrow function & destructuring
 * - Spread operator untuk extend response body
 */

// Prototype dasar sebuah API Response
const ResponsePrototype = {
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
      ...(this.errors !== undefined && { errors: this.errors }),
      ...(this.meta !== undefined && { meta: this.meta }),
    };
  },
};

/**
 * createResponse — factory function menggunakan Object.create.
 * Setiap response object mewarisi method toJSON dari ResponsePrototype.
 *
 * @param {boolean} success
 * @param {string}  message
 * @param {any}     [data]
 * @param {object}  [meta] - info tambahan seperti pagination
 * @returns {object}
 */
const createResponse = (success, message, data, meta) => {
  const response = Object.create(ResponsePrototype);
  response.success = success;
  response.message = message;
  response.data    = data;
  response.meta    = meta;
  return response;
};

// ─── Shorthand Helpers ────────────────────────────────────────────────────────

/** Response sukses dengan data */
const successResponse = (res, message, data, statusCode = 200, meta) => {
  const body = createResponse(true, message, data, meta);
  return res.status(statusCode).json(body.toJSON());
};

/** Response sukses tanpa data (ex: DELETE) */
const noContentResponse = (res, message = 'Berhasil') => {
  return res.status(200).json(createResponse(true, message).toJSON());
};

/** Response error client (4xx) */
const clientErrorResponse = (res, message, statusCode = 400, errors) => {
  const body = Object.create(ResponsePrototype);
  body.success = false;
  body.message = message;
  body.errors  = errors;
  return res.status(statusCode).json(body.toJSON());
};

/** Response not found (404) */
const notFoundResponse = (res, entity = 'Data') => {
  return clientErrorResponse(res, `${entity} tidak ditemukan.`, 404);
};

module.exports = {
  successResponse,
  noContentResponse,
  clientErrorResponse,
  notFoundResponse,
};
