
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import ideaRoutes from './routes/ideas.js';
import reviewerRoutes from './routes/reviewers.js';
import usersRoutes from './routes/users.js';
import path from 'path';
import { fileURLToPath } from 'url';

// These two lines are needed if you're using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002; // Changed from 5001 to 3002 for proxy setup

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Serve static files from the uploads directory
app.use('/app/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Middleware
// CORS configuration for development - allow all origins on LAN/dev
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 600, // Cache preflight for 10 minutes
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// MongoDB connection with graceful error handling
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'MONGODB_URI=mongodb+srv://vithack28:vithack28@cluster0.cq6gr.mongodb.net/Kaizen_Idea?retryWrites=true&w=majority&appName=Cluster0', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');
    mongoose.connection.on('connected', () => {
      console.log('Connected to DB:', mongoose.connection.name);
    });
    return true;
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed:', err.message);
    console.log('📝 Running in development mode without database connection');
    console.log('🔧 To connect to MongoDB, please:');
    console.log('   1. Install MongoDB locally, or');
    console.log('   2. Set up a MongoDB Atlas cluster, or');
    console.log('   3. Set the MONGODB_URI environment variable');
    console.log('   4. Run: npm run init-db');
    return false;
  }
};

// Initialize database connection
let isDbConnected = false;

// Routes - only mount if database is connected
const setupRoutes = () => {
  if (isDbConnected) {
    app.use('/api/admin/auth', authRoutes);
    app.use('/api/admin/employees', employeeRoutes);
    app.use('/api/admin/ideas', ideaRoutes);
    app.use('/api/admin/reviewers', reviewerRoutes);
    app.use('/api/admin/users', usersRoutes);
    console.log('✅ API routes mounted');
  }
};

// Initialize app
const initializeApp = async () => {
  isDbConnected = await connectToMongoDB();
  setupRoutes();
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
  });

  // Add this after all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SakthiAdmin server running on port ${PORT}`);
    console.log(`🔗 API will be available at: http://localhost:${PORT}/api`);
  });
};

initializeApp();