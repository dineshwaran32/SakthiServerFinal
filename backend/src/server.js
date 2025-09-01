require('dotenv').config();



// Set fallback JWT_SECRET if not provided

if (!process.env.JWT_SECRET) {

 process.env.JWT_SECRET = 'fallback_jwt_secret_for_development_only';

 console.warn('⚠️ JWT_SECRET not set, using fallback secret. Set JWT_SECRET in production!');

}

// Set fallback JWT_EXPIRES_IN if not provided

if (!process.env.JWT_EXPIRES_IN) {

 process.env.JWT_EXPIRES_IN = '7d';

 console.warn('⚠️ JWT_EXPIRES_IN not set, using 7 days. Set JWT_EXPIRES_IN in production!');

}

// Set fallback MONGODB_URI if not provided

if (!process.env.MONGODB_URI) {

 process.env.MONGODB_URI = 'mongodb+srv://vithack28:vithack28@cluster0.cq6gr.mongodb.net/Sakthi_Spark?retryWrites=true&w=majority&appName=Cluster0';

 console.warn('⚠️ MONGODB_URI not set, using localhost. Set MONGODB_URI in production!');

}

const express = require('express');

const cors = require('cors');

const helmet = require('helmet');

const morgan = require('morgan');

const compression = require('compression');

const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');

// Import routes

const authRoutes = require('./routes/auth');

const ideaRoutes = require('./routes/ideas');

const userRoutes = require('./routes/users');

const notificationRoutes = require('./routes/notifications');

const app = express();

// Connect to MongoDB

connectDB();

// Security middleware

app.use(helmet({

 contentSecurityPolicy: {

  directives: {

   defaultSrc: ["'self'"],

   imgSrc: ["*", "data:"], // Allow images from any origin and data URIs

   // ...other directives as needed

  }

 }

}));

// Rate limiting - DISABLED FOR DEVELOPMENT

// const limiter = rateLimit({

// windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes

// max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'development' ? 10000 : 1000), // Higher limit for development

// message: {

// success: false,

// message: 'Too many requests from this IP, please try again later.'

// },

// standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers

// legacyHeaders: false, // Disable the `X-RateLimit-*` headers

// });

// More lenient rate limiter for auth endpoints - DISABLED FOR DEVELOPMENT

// const authLimiter = rateLimit({

// windowMs: 15 * 60 * 1000, // 15 minutes

// max: process.env.NODE_ENV === 'development' ? 100 : 20, // Allow more login attempts in development

// message: {

// success: false,

// message: 'Too many login attempts, please try again later.'

// },

// standardHeaders: true,

// legacyHeaders: false,

// });

// app.use('/api/', limiter);

// CORS configuration

const corsOptions = {

 origin: true, // reflect origin for dev, allows LAN access

 credentials: true,

 methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

 allowedHeaders: ['Content-Type', 'Authorization', 'X-Debug-Request', 'Accept', 'X-Requested-With', 'cache-control'],

 optionsSuccessStatus: 200

};

app.use(cors(corsOptions));

// Compression middleware

app.use(compression());

// Logging middleware

if (process.env.NODE_ENV === 'development') {

 app.use(morgan('dev'));

 // Additional custom logging for debugging

 app.use((req, res, next) => {

  console.log(`Incoming request: ${req.method} ${req.url}`);

  console.log('Headers:', req.headers);

  next();

 });

} else {

 app.use(morgan('combined'));

}

// Body parsing middleware

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve uploaded images

const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');

// Add CORS headers for static file responses

app.use('/backend/uploads', (req, res, next) => {

 res.header('Access-Control-Allow-Origin', '*');

 res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');

 res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

 res.header('Cross-Origin-Resource-Policy', 'cross-origin');

 next();

}, express.static(uploadsDir));

app.use('/app/uploads', express.static(uploadsDir));

// Health check endpoint

app.get('/app/api/health', (req, res) => {

 res.json({

  status: 'success',

  message: 'Sakthi Spark API is running',

  timestamp: new Date().toISOString()

 });

});

// API routes

app.use('/app/api/auth', authRoutes);

app.use('/app/api/ideas', ideaRoutes);

app.use('/app/api/users', userRoutes);

app.use('/app/api/notifications', notificationRoutes);

// ===================== Frontend Static Files =====================

// Build the React/Vite app first (npm run build in SakthiAdmin) which outputs the dist folder.

const frontEndPath = path.join(__dirname, '..', '..', 'SakthiAdmin', 'dist');

app.use(express.static(frontEndPath));

// For any non-API GET request, return the SPA's index.html so that client-side routing works.

app.get(/^\/(?!app\/api).*$/, (req, res) => {

 res.sendFile(path.join(frontEndPath, 'index.html'));

});

// 404 handler

app.use('*', (req, res) => {

 res.status(404).json({

  success: false,

  message: 'Route not found'

 });

});

// Global error handler

app.use((err, req, res, next) => {

 console.error('Error:', err);

 res.status(err.status || 500).json({

  success: false,

  message: err.message || 'Internal server error',

  ...(process.env.NODE_ENV === 'development' && { stack: err.stack })

 });

});

// Listen on port env.PORT or fallback to 80 so both frontend and backend share the same port.

const PORT = process.env.PORT || 80;

app.listen(PORT,"0.0.0.0", () => {

 console.log(`🚀 Server running on port ${PORT}`);

 console.log(`📊 Environment: ${process.env.NODE_ENV}`);

 // console.log(`🔗 http://localhost:${PORT}/health`);

});

module.exports = app;























































