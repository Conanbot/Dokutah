'use strict';

/**
 * src/utils/geoHelper.js
 * Utility untuk kalkulasi jarak geografis dan sorting berdasarkan lokasi.
 *
 * Konsep JS yang diterapkan:
 * - Pure functions (tidak mengubah state luar)
 * - Higher-order functions: sortByDistance menggunakan callback comparator
 * - Destructuring parameter
 * - Arrow functions
 */

const EARTH_RADIUS_KM = 6371;

/**
 * degreesToRadians — konversi derajat ke radian.
 * @param {number} degrees
 * @returns {number}
 */
const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * calculateDistance — menghitung jarak antara dua titik koordinat
 * menggunakan formula Haversine.
 *
 * @param {{ lat: number, lng: number }} pointA
 * @param {{ lat: number, lng: number }} pointB
 * @returns {number} jarak dalam kilometer (dibulatkan 2 desimal)
 */
const calculateDistance = ({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) => {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) *
    Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
};

/**
 * enrichWithDistance — Higher-order function:
 * menerima array lokasi dan menambahkan field `distance_km` ke setiap item.
 *
 * @param {Array}  locations - array objek dengan field `latitude` dan `longitude`
 * @param {{ lat: number, lng: number }} userLocation - koordinat pengguna
 * @param {number} [radiusKm=10] - filter radius maksimum
 * @returns {Array} array yang sudah diurutkan berdasarkan jarak terdekat
 */
const enrichWithDistance = (locations, userLocation, radiusKm = 10) => {
  return locations
    .map((loc) => ({
      ...loc,
      distance_km: calculateDistance(userLocation, {
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
      }),
    }))
    .filter(({ distance_km }) => distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
};

/**
 * parseCoordinates — mem-parsing dan memvalidasi lat/lng dari query string.
 * Mengembalikan null jika tidak valid.
 *
 * @param {string} lat
 * @param {string} lng
 * @returns {{ lat: number, lng: number } | null}
 */
const parseCoordinates = (lat, lng) => {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  const isValid =
    !isNaN(parsedLat) &&
    !isNaN(parsedLng) &&
    parsedLat >= -90  && parsedLat <= 90 &&
    parsedLng >= -180 && parsedLng <= 180;

  return isValid ? { lat: parsedLat, lng: parsedLng } : null;
};

module.exports = { calculateDistance, enrichWithDistance, parseCoordinates };
