import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sakthi_spark_admin';

const initializeDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for initialization');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const adminUser = new User({
        email: 'admin@example.com',
        password: 'Sakthiadmin',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        employeeNumber: 'ADMIN001',
        department: 'admin',
        designation: 'Administrator',
        mobileNumber: '+919095145230'
      });
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Check if reviewer user already exists
    const existingReviewer = await User.findOne({ email: 'reviewer@example.com' });
    if (!existingReviewer) {
      const reviewerUser = new User({
        email: 'reviewer@example.com',
        password: 'reviewer123',
        name: 'Reviewer User',
        role: 'reviewer',
        isActive: true,
        employeeNumber: 'reviewer001',
        department: 'admin',
        designation: 'Administrator',
        mobileNumber: '+916382914506'
      });
      await reviewerUser.save();
      console.log('Reviewer user created successfully');
    } else {
      console.log('Reviewer user already exists');
    }

    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase(); 