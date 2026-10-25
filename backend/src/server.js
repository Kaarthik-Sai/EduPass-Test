require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const required = ['MONGO_URI', 'JWT_SECRET', 'QR_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) { console.error(`Missing env vars: ${missing.join(', ')}`); process.exit(1); }

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`EduPass API running on port ${PORT}`)))
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });

module.exports = app;
