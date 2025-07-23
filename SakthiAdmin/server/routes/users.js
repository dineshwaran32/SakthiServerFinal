import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, department, search, sortBy = 'creditPoints', sortOrder = 'desc' } = req.query;
    
    const query = { isActive: true };
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments(query);
    const departments = await User.distinct('department', { isActive: true });

    res.json({
      users,
      total,
      departments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk upsert users
router.post('/bulk-upsert', authenticateToken, async (req, res) => {
  try {
    const users = req.body.users || [];
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'No users provided.' });
    }
    const schemaFields = [
      'employeeNumber', 'name', 'email', 'department', 'designation', 'role',
      'creditPoints', 'isActive', 'lastLogin', 'createdAt', 'updatedAt', 'mobileNumber'
    ];
    let added = 0, skipped = 0;
    for (const user of users) {
      // Initialize missing fields
      const doc = {};
      for (const field of schemaFields) {
        if (field === 'creditPoints') doc[field] = user[field] ?? 0;
        else if (field === 'isActive') doc[field] = user[field] ?? true;
        else doc[field] = user[field] ?? '';
      }
      // Upsert by employeeNumber
      const existing = await User.findOne({ employeeNumber: doc.employeeNumber });
      if (existing) {
        skipped++;
        continue;
      }
      await User.create(doc);
      added++;
    }
    res.json({ message: `Added ${added} users, skipped ${skipped} (duplicates).` });
  } catch (error) {
    console.error('Bulk upsert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Add route to update a user by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    let data = { ...req.body };
    if (data.password && (data.role === 'admin' || data.role === 'reviewer')) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add route to soft-delete a user by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 