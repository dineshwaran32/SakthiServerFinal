import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login
router.post('/login', async (req, res) => {
  try {
    const { employeeNumber, password } = req.body;

    console.log('Login attempt:', { employeeNumber, password: password ? '***' : 'undefined' });

    if (!employeeNumber || !password) {
      return res.status(400).json({ message: 'Employee number and password are required' });
    }

    const user = await User.findOne({ employeeNumber, isActive: true });
    console.log('User found:', user ? { 
      employeeNumber: user.employeeNumber, 
      role: user.role, 
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    } : 'Not found');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }

    // Only allow login for admin and reviewer
    if (user.role === 'employee') {
      return res.status(401).json({ message: 'Access denied. Only administrators and reviewers can access this portal.' });
    }

    // Password check logic
    if (user.role === 'admin' || user.role === 'reviewer') {
      console.log('Comparing passwords...');
      const isMatch = await bcrypt.compare(password, user.password || '');
      console.log('Password match result:', isMatch);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid employee number or password' });
      }
    }

    const token = jwt.sign(
      { userId: user._id, employeeNumber: user.employeeNumber, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        employeeNumber: user.employeeNumber,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        creditPoints: user.creditPoints,
        mobileNumber: user.mobileNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      employeeNumber: req.user.employeeNumber,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department
    }
  });
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;