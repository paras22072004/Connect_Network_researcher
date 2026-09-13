const mongoose = require('mongoose');

/**
 * Establishes connection with MongoDB database.
 * Enables automatic creation of GeoJSON 2dsphere indexes for spatial queries.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/location_networking_db');
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Exit process with failure code if database connection cannot be established
    process.exit(1);
  }
};

module.exports = connectDB;
