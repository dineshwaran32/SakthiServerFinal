import express from 'express';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all reviewers
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reviewers = await User.find({ 
      role: { $in: ['admin', 'reviewer'] },
      isActive: true 
    }).select('-password');
    
    res.json(reviewers);
  } catch (error) {
    console.error('Get reviewers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new reviewer
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'reviewer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = new User({ name, email, password, role });
    await user.save();

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Create reviewer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update reviewer
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update reviewer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate reviewer
router.patch('/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Reviewer deactivated successfully' });
  } catch (error) {
    console.error('Deactivate reviewer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;