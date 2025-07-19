const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Common CORS headers helper for proxy responses
const allowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept';
const setCors = (proxyRes, req) => {
  const origin = req.headers.origin || '';
  proxyRes.headers['Access-Control-Allow-Origin'] = origin;
  proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,PATCH,OPTIONS';
  proxyRes.headers['Access-Control-Allow-Headers'] = allowedHeaders;
};

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from SakthiAdmin/build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'SakthiAdmin/build')));
}

// Proxy configuration for the backend API
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:3000', // Backend server
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/app/api' // Rewrite path: /api -> /app/api
  },
  router: {
    // Route specific paths to ensure proper prefixing
    '/api/ideas': 'http://localhost:3000/app/api/ideas',
    // Add other API endpoints here as needed
  },
  ws: true, // proxy websockets
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // Log the request for debugging
    console.log(`Proxying: ${req.method} ${req.path} -> ${proxyReq.path}`);
    // Add any custom headers if needed
    proxyReq.setHeader('X-Forwarded-For', req.ip || 'unknown');
  },
  onProxyRes: setCors,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Proxy error', 
        details: err.message,
        originalUrl: req.originalUrl,
        path: req.path
      });
    }
  }
});

// Proxy configuration for the admin frontend
const adminProxy = createProxyMiddleware({
  target: 'http://localhost:5001', // SakthiAdmin server
  changeOrigin: true,
  ws: true, // proxy websockets
  logLevel: 'debug',
  onProxyReq: () => {},
  onProxyRes: setCors,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
});

// Proxy for admin API
app.use('/api/admin', createProxyMiddleware({
  target: 'http://localhost:5001', // SakthiAdmin server
  changeOrigin: true,
  ws: true,
  logLevel: 'debug',
  onProxyRes: setCors,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}));

// Enhanced CORS configuration for development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins (add your React Native development server IP here)
    const allowedOrigins = [
      'http://localhost:19006',  // Default Expo web port
      'http://localhost:19000',  // Expo web port range
      'http://10.0.2.2:19006',   // Android Emulator
      'http://10.0.2.2:19000',   // Android Emulator range
      'http://10.35.187.142:19006', // Your local IP
      /^\.*sakthi\.app$/,       // Your production domain
    ];

    // Check if the origin is allowed
    if (allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return pattern === origin;
    })) {
      return callback(null, true);
    }
    
    console.warn(`Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: allowedHeaders,
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with the above configuration
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// API routes go to backend
app.use('/api', apiProxy);

// All other routes go to the admin frontend
app.use('/', adminProxy);

// Add a specific handler for the root path
app.get('/', (req, res) => {
  res.send('Welcome to Sakthi Admin Server. Navigate to the Admin UI or API endpoints.');
});

// Get network interfaces to show available IPs
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const ips = [];

// Get all IPv4 addresses
Object.keys(nets).forEach(iface => {
  nets[iface].forEach(details => {
    if (details.family === 'IPv4' && !details.internal) {
      ips.push(details.address);
    }
  });
});


const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Access from other devices using your local IP: http://${getLocalIpAddress()}:${PORT}`);
  console.log(`\n📡 Proxying:`);
  console.log(`   - API requests (/api/*) -> http://localhost:3000/app/api`);
  console.log(`   - Admin UI (/*)       -> http://localhost:5001`);
  console.log('\n📱 For Android Emulator, use: http://10.0.2.2:5000');
});

// Add this helper function at the top of the file
const getLocalIpAddress = () => {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      const { address, family, internal } = iface;
      if (family === 'IPv4' && !internal && address !== '127.0.0.1') {
        return address;
      }
    }
  }
  return 'localhost';
};

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please close the other application or use a different port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
