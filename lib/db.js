require('dotenv').config();
const mongoose = require('mongoose');

let cached = global.__glovoMongoose;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/glovo-oujda';
  if (!cached) cached = global.__glovoMongoose = { conn: null };
  if (cached.conn && cached.conn.readyState === 1) return cached.conn;
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  cached.conn = mongoose.connection;
  return cached.conn;
}

module.exports = { connectDB };
