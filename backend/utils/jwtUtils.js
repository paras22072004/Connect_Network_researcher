const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT authentication token for a given user ID.
 * @param {string} userId - MongoDB ObjectId of the user.
 * @returns {string} Signed JWT Token.
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'supersecret_location_networking_jwt_key_2026',
    { expiresIn: '30d' }
  );
};

module.exports = { generateToken };
