'use strict';

/**
 * src/middleware/logger.js
 * Middleware untuk mencatat setiap HTTP request yang masuk.
 *
 * Konsep JS yang diterapkan:
 * - Closure: requestLogger mengakses startTime dari scope luar
 * - Arrow functions
 * - Template literal
 * - Callback pattern (next)
 */

// Map warna ANSI untuk terminal — Object.create(null) tanpa prototype
const COLORS = Object.create(null);
COLORS.reset  = '\x1b[0m';
COLORS.green  = '\x1b[32m';
COLORS.yellow = '\x1b[33m';
COLORS.red    = '\x1b[31m';
COLORS.cyan   = '\x1b[36m';
COLORS.dim    = '\x1b[2m';

/**
 * getStatusColor — Higher-order function:
 * mengembalikan warna berdasarkan HTTP status code.
 *
 * @param {number} statusCode
 * @returns {string} ANSI color code
 */
const getStatusColor = (statusCode) => {
  if (statusCode < 300) return COLORS.green;
  if (statusCode < 400) return COLORS.cyan;
  if (statusCode < 500) return COLORS.yellow;
  return COLORS.red;
};

/**
 * formatTimestamp — mengembalikan waktu saat ini dalam format ISO lokal.
 * @returns {string}
 */
const formatTimestamp = () => new Date().toISOString().replace('T', ' ').split('.')[0];

/**
 * requestLogger — middleware yang mencatat setiap request & response.
 * Menggunakan closure: `startTime` dibuat saat request masuk,
 * lalu digunakan saat response dikirim (via `res.on('finish')`).
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now(); // closure: startTime "diingat" oleh callback finish

  const { method, originalUrl, ip } = req;

  // Event listener dipasang di response — callback pattern
  res.on('finish', () => {
    const { statusCode } = res;
    const duration  = Date.now() - startTime; // akses startTime dari closure
    const color     = getStatusColor(statusCode);

    // Tidak log static assets agar log tidak berisik
    if (originalUrl.startsWith('/api')) {
      console.log(
        `${COLORS.dim}[${formatTimestamp()}]${COLORS.reset} ` +
        `${COLORS.cyan}${method.padEnd(6)}${COLORS.reset} ` +
        `${originalUrl.padEnd(40)} ` +
        `${color}${statusCode}${COLORS.reset} ` +
        `${COLORS.dim}${duration}ms — ${ip}${COLORS.reset}`,
      );
    }
  });

  next(); // lanjut ke middleware berikutnya — callback pattern
};

module.exports = { requestLogger };
