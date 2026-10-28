require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 5000;
let server;
const shutdown = async (signal) => {
  console.log(`${signal} received; closing EduPass`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  process.exit(0);
};

connectDB()
  .then(() => {
    server = app.listen(PORT, () => console.log(`EduPass API running on port ${PORT}`));
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((error) => {
    console.error('Startup failed:', connectDB.safeDatabaseError(error));
    process.exit(1);
  });
