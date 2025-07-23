import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all employees with pagination and filtering
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

    const employees = await User.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments(query);
    const departments = await User.distinct('department', { isActive: true });

    res.json({
      employees,
      total,
      departments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee by employeeNumber
router.get('/by-employee-number/:employeeNumber', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Searching for employeeNumber:', req.params.employeeNumber);
    const employee = await User.findOne({ employeeNumber: req.params.employeeNumber });
    console.log('Found employee:', employee);
    if (!employee || !employee.isActive) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Get employee by employeeNumber error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee || !employee.isActive) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new employee
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let data = { ...req.body };
    if (data.password && (data.role === 'admin' || data.role === 'reviewer')) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const employee = new User(data);
    await employee.save();
    
    res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `Employee with this ${duplicateField} already exists` 
      });
    }
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employee
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let data = { ...req.body };
    if (data.password && (data.role === 'admin' || data.role === 'reviewer')) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employee by employeeNumber
router.put('/by-employee-number/:employeeNumber', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let data = { ...req.body };
    if (data.password && (data.role === 'admin' || data.role === 'reviewer')) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const employee = await User.findOneAndUpdate(
      { employeeNumber: req.params.employeeNumber },
      data,
      { new: true, runValidators: true }
    );
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Update employee by employeeNumber error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employee credit points
router.patch('/:id/credits', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { creditPoints, reason } = req.body;
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { creditPoints },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Update credits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete employee
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk import employees from Excel
router.post('/bulk-import', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('Extracted Excel data:', data);

    const results = [];
    const successes = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const employeeData = {
          employeeNumber: String(row.employeeNumber || row['Employee Number'] || ''),
          name: row.name || row['Name'],
          email: row.email || row['Email'],
          department: (row.department || row['Department'] || '').toLowerCase(),
          designation: row.designation || row['Designation'],
          role: (row.role || row['Role'] || 'employee').toLowerCase(),
          creditPoints: row.creditPoints || row['Credit Points'] || 0,
          mobileNumber: String(row.mobileNumber || row['Mobile Number'] || '')
        };
        // Add +91 prefix if not present
        if (employeeData.mobileNumber && !employeeData.mobileNumber.startsWith('+91')) {
          // Remove any leading zeros or pluses before adding +91
          employeeData.mobileNumber = '+91' + employeeData.mobileNumber.replace(/^0+|^\+/, '');
        }
        // Check for duplicate email (with different employeeNumber)
        const existingByEmail = await User.findOne({ email: employeeData.email });
        if (existingByEmail && existingByEmail.employeeNumber !== employeeData.employeeNumber) {
          errors.push(`Row ${i + 2}: Duplicate email found for another employee (employeeNumber: ${existingByEmail.employeeNumber})`);
          continue;
        }
        // Validate before upsert
        const temp = new User(employeeData);
        await temp.validate();
        // Upsert (override if exists)
        const updated = await User.findOneAndUpdate(
          { employeeNumber: employeeData.employeeNumber },
          employeeData,
          { upsert: true, new: true, runValidators: true }
        );
        results.push(updated);
        successes.push(`Row ${i + 2}: Imported/updated employeeNumber ${employeeData.employeeNumber}`);
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Always return both successes and errors
    res.json({
      message: `Import completed. ${successes.length} succeeded, ${errors.length} failed.`,
      successes,
      errors,
      employees: results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export employees to Excel
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const employees = await User.find({ isActive: true }).lean();
    
    const data = employees.map(emp => ({
      'Employee Number': emp.employeeNumber,
      'Name': emp.name,
      'Email': emp.email,
      'Department': emp.department,
      'Designation': emp.designation,
      'Role': emp.role,
      'Credit Points': emp.creditPoints,
      'Phone Number': emp.mobileNumber || '',
      'Created At': emp.createdAt ? emp.createdAt.toISOString().split('T')[0] : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download bulk delete template
router.get('/bulk-delete-template', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Create sample data for the template
    const sampleData = [
      { 'Employee Number': '12345' },
      { 'Employee Number': '23456' },
      { 'Employee Number': '34567' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Delete Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=bulk-delete-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk delete employees from Excel
router.post('/bulk-delete', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('Extracted Excel data for bulk delete:', data);

    const results = [];
    const successes = [];
    const errors = [];
    const notFound = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Only use employeeNumber
        const employeeNumber = row['Employee Number'] || row.employeeNumber;
        if (!employeeNumber) {
          errors.push(`Row ${i + 2}: No Employee Number found`);
          continue;
        }
        // Find and delete by employeeNumber only
        const deletedEmployee = await User.findOneAndUpdate(
          { employeeNumber: String(employeeNumber) },
          { isActive: false },
          { new: true }
        );
        if (deletedEmployee) {
          results.push(deletedEmployee);
          successes.push(`Row ${i + 2}: Deleted employee ${deletedEmployee.name} (${deletedEmployee.employeeNumber})`);
        } else {
          notFound.push(`Row ${i + 2}: Employee with Employee Number "${employeeNumber}" not found`);
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Clean up the uploaded file
    try {
      const fs = await import('fs');
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    // Always return both successes and errors
    res.json({
      message: `Bulk delete completed. ${successes.length} deleted, ${notFound.length} not found, ${errors.length} errors.`,
      successes,
      notFound,
      errors,
      deletedEmployees: results
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;