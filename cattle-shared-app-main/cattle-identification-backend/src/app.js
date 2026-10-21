const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// ========== CORS Middleware (MUST BE FIRST) ==========
const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  }
  return null; // null means allow all origins
};

app.use((req, res, next) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;

  if (!allowedOrigins) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || !allowedOrigins) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// ========== Security Middleware ==========
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));


// ========== Body Parser Middleware ==========
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== Logging Middleware ==========
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ========== Static Files ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== Health Check Route ==========
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cattle Identification System API',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ========== API Routes ==========
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cattleRoutes = require('./routes/cattleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const identificationRoutes = require('./routes/identificationRoutes');
const locationRoutes = require('./routes/locationRoutes');

const apiVersion = process.env.API_VERSION || 'v1';

// ✅ FIXED: Added parentheses () instead of backticks ``
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/cattle`, cattleRoutes);
app.use(`/api/${apiVersion}/admin`, adminRoutes);
app.use(`/api/${apiVersion}/reports`, reportRoutes);
app.use(`/api/${apiVersion}/locations`, locationRoutes);

// ✅ FIXED: Correct mounting for identification routes
// This will handle /api/v1/cattle/identify/*
app.use(`/api/${apiVersion}/cattle`, identificationRoutes);

// ========== Error Handling ==========
app.use(notFound);
app.use(errorHandler);

module.exports = app;