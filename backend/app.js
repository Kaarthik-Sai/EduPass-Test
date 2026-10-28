require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const connectDB = require('./config/db');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((v) => v.trim()).filter(Boolean);
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Liveness stays available if MongoDB is starting or unavailable.
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', async (req, res, next) => {
    try {
      if (!process.env.JWT_SECRET) {
        console.error('Service configuration incomplete: JWT_SECRET is not set');
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' });
      }
      await connectDB();
      next();
    } catch (error) {
      console.error('Database unavailable:', connectDB.safeDatabaseError(error));
      res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' });
    }
  });
}
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
