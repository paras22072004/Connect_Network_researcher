/**
 * Distance Calculation and Privacy Obfuscation Utility
 * 
 * Computes exact distance using the Haversine Formula between two [longitude, latitude] pairs,
 * and transforms exact measurements into human-readable approximate distance ranges.
 * This guarantees that raw coordinates are NEVER exposed to end users.
 */

/**
 * Calculates distance in meters between two geographical points using Haversine formula.
 * @param {number} lat1 - Latitude of origin
 * @param {number} lon1 - Longitude of origin
 * @param {number} lat2 - Latitude of destination
 * @param {number} lon2 - Longitude of destination
 * @returns {number} Distance in meters
 */
const calculateHaversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // Distance in meters
};

/**
 * Formats exact distance into privacy-compliant approximate distance labels.
 * @param {number} distanceMeters - Distance in meters
 * @returns {string} Human-readable privacy label
 */
const formatApproximateDistance = (distanceMeters) => {
  if (distanceMeters < 100) {
    return 'Less than 100 meters away';
  } else if (distanceMeters <= 500) {
    return 'Within 500 meters';
  } else if (distanceMeters <= 1000) {
    return 'Within 1 km';
  } else if (distanceMeters <= 5000) {
    return 'Within 5 km';
  } else {
    return 'Nearby';
  }
};

module.exports = {
  calculateHaversineDistanceMeters,
  formatApproximateDistance
};
