'use strict';

/**
 * src/middleware/errorHandler.js
 * Global error handling middleware untuk Express.
 *
 * Konsep JS yang diterapkan:
 * - Closures: errorHandler adalah fungsi yang mengakses variabel luar (NODE_ENV)
 * - Destructuring
 * - Arrow functions
 * - Error type detection dengan instanceof dan custom properties
 */

/**
 * AppError — Custom Error class untuk operational errors.
 * Menggunakan Object.create untuk inherit dari Error.prototype.
 *
 * @param {string} message - pesan error yang aman ditampilkan ke user
 * @param {number} statusCode - HTTP status code
 */
const AppError = function (message, statusCode) {
  // Gunakan Object.create untuk mewarisi Error.prototype
  const error = Object.create(AppError.prototype);
  error.message      = message;
  error.statusCode   = statusCode;
  error.isOperational = true; // flag: error ini sudah kita rencanakan
  error.stack        = new Error(message).stack;
  return error;
};
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.name = 'AppError';

/**
 * handlePostgresError — mengolah error spesifik dari PostgreSQL.
 * Menggunakan destructuring dan switch.
 *
 * @param {object} err - error dari pg
 * @returns {AppError}
 */
const handlePostgresError = ({ code, detail }) => {
  switch (code) {
    case '23505': // unique violation
      return AppError(`Data sudah ada. ${detail || ''}`, 409);
    case '23503': // foreign key violation
      return AppError('Data referensi tidak ditemukan.', 400);
    case '22P02': // invalid input syntax
      return AppError('Format data tidak valid.', 400);
    default:
      return AppError('Terjadi kesalahan pada database.', 500);
  }
};

/**
 * sendErrorDev — kirim error detail saat development (untuk debugging).
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    stack:   err.stack,
    error:   err,
  });
};

/**
 * sendErrorProd — kirim error yang aman saat production.
 * Error internal (programming bugs) tidak ditampilkan ke user.
 */
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // Error yang sudah kita rencanakan — aman ditampilkan
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    // Programming error — jangan tampilkan detail ke user
    console.error('[ERROR] Unhandled programming error:', err);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    });
  }
};

/**
 * errorHandler — Express error handling middleware (4 parameter).
 * HARUS dipasang paling terakhir di app.use().
 * Closure: mengakses NODE_ENV dari luar melalui process.env.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let error = { ...err, message: err.message, stack: err.stack };
  error.statusCode = err.statusCode || 500;

  // Deteksi error dari PostgreSQL (pg library)
  if (err.code && typeof err.code === 'string' && err.code.match(/^\d{5}$/)) {
    error = handlePostgresError(err);
  }

  // Deteksi JSON parse error dari express.json()
  if (err.type === 'entity.parse.failed') {
    error = AppError('Format JSON tidak valid.', 400);
  }

  const { NODE_ENV = 'development' } = process.env;

  if (NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * notFound — middleware untuk route yang tidak ditemukan.
 * Dipanggil sebelum errorHandler jika tidak ada route yang cocok.
 */
const notFound = (req, res, next) => {
  const error = AppError(`Route ${req.method} ${req.originalUrl} tidak ditemukan.`, 404);
  next(error);
};

module.exports = { errorHandler, notFound, AppError };
