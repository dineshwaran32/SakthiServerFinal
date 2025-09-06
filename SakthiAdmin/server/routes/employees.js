import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
// Configure multer with better error handling and file size limits
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'), false);
    }
  }
});

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

// Download bulk insert template
router.get('/bulk-insert-template', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Path to the template file in the files folder
    const templatePath = path.join(process.cwd(), 'server', 'files', 'bulkinsert.xlsx');
    
    // Check if file exists
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ message: 'Template file not found' });
    }
    
    // Read and send the file
    const fileBuffer = fs.readFileSync(templatePath);
    
    res.setHeader('Content-Disposition', 'attachment; filename=bulk-insert-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Insert template download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download bulk delete template
router.get('/bulk-delete-template', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Path to the template file in the files folder
    const templatePath = path.join(process.cwd(), 'server', 'files', 'bulkdelete.xlsx');
    
    // Check if file exists
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ message: 'Template file not found' });
    }
    
    // Read and send the file
    const fileBuffer = fs.readFileSync(templatePath);
    
    res.setHeader('Content-Disposition', 'attachment; filename=bulk-delete-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Delete template download error:', error);
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
    
    // Format mobile number - add +91 if not present
    if (data.mobileNumber) {
      // Remove any existing +91, +, or leading zeros first
      let cleanNumber = data.mobileNumber.replace(/^\+91|^\+|^0+/, '');
      
      // Add +91 prefix
      data.mobileNumber = '+91' + cleanNumber;
    }
    
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
    
    // Format mobile number - add +91 if not present
    if (data.mobileNumber) {
      // Remove any existing +91, +, or leading zeros first
      let cleanNumber = data.mobileNumber.replace(/^\+91|^\+|^0+/, '');
      
      // Add +91 prefix
      data.mobileNumber = '+91' + cleanNumber;
    }
    
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
    
    // Format mobile number - add +91 if not present
    if (data.mobileNumber) {
      // Remove any existing +91, +, or leading zeros first
      let cleanNumber = data.mobileNumber.replace(/^\+91|^\+|^0+/, '');
      
      // Add +91 prefix
      data.mobileNumber = '+91' + cleanNumber;
    }
    
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
router.post('/bulk-import', authenticateToken, requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large',
          errors: ['File size must be less than 10MB']
        });
      }
      if (typeof err.message === 'string' && err.message.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type',
          errors: ['Please upload a valid Excel file (.xlsx or .xls)']
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Upload failed',
        errors: [typeof err.message === 'string' ? err.message : 'Unknown upload error']
      });
    }
    next();
  });
}, async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded',
        errors: ['Please select an Excel file to upload']
      });
    }

    uploadedFilePath = req.file.path;

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        errors: ['Please upload a valid Excel file (.xlsx or .xls)']
      });
    }

    // Validate file size (max 10MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        errors: ['File size must be less than 10MB']
      });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection lost',
        errors: ['Please try again later']
      });
    }

    // Read and parse Excel file with error handling
    let workbook, data;
    try {
      workbook = XLSX.readFile(uploadedFilePath);
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Excel file',
          errors: ['Excel file contains no worksheets']
        });
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Validate header row strictly against the required template
      const headerRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      const header = Array.isArray(headerRows) && headerRows.length > 0 ? headerRows[0] : [];
      const normalizedHeader = header.map(h => String(h).trim());
      // Tolerate trailing empty header cells (common in exported templates)
      while (normalizedHeader.length > 0 && normalizedHeader[normalizedHeader.length - 1] === '') {
        normalizedHeader.pop();
      }
      const requiredHeader = [
        'employeeNumber',
        'name',
        'email',
        'department',
        'designation',
        'role',
        'mobileNumber'
      ];

      const headersMatch = requiredHeader.length === normalizedHeader.length &&
        requiredHeader.every((col, idx) => col === normalizedHeader[idx]);

      if (!headersMatch) {
        try {
          if (uploadedFilePath) {
            const fs = await import('fs');
            if (fs.existsSync(uploadedFilePath)) {
              fs.unlinkSync(uploadedFilePath);
            }
          }
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file on header mismatch:', cleanupError);
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid Excel header format',
          errors: [
            `Header row must exactly be: ${requiredHeader.join(', ')}`,
            `Received: ${normalizedHeader.join(', ') || 'No headers found'}`
          ]
        });
      }

      // Parse data rows after header validation
      data = XLSX.utils.sheet_to_json(worksheet);
      
      if (!data || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Empty Excel file',
          errors: ['Excel file contains no data rows']
        });
      }

      // Limit processing to prevent memory issues
      if (data.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'File too large',
          errors: ['Maximum 1000 rows allowed per import']
        });
      }
    } catch (excelError) {
      console.error('Excel parsing error:', excelError);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Excel file',
        errors: ['Please ensure the file is a valid Excel format']
      });
    }

    console.log(`Processing ${data.length} rows from Excel file`);

    const results = [];
    const successes = [];
    const errors = [];
    const warnings = [];

    // Prefetch existing users to avoid per-row lookups (performance)
    const importEmployeeNumbers = Array.from(new Set(data
      .map(r => String((r.employeeNumber || r['Employee Number'] || '')).trim())
      .filter(v => v)));
    const importEmails = Array.from(new Set(data
      .map(r => String((r.email || r['Email'] || '')).trim().toLowerCase())
      .filter(v => v)));

    const [existingByEmpNumDocs, existingByEmailDocs] = await Promise.all([
      importEmployeeNumbers.length ? User.find({ employeeNumber: { $in: importEmployeeNumbers } }).lean() : [],
      importEmails.length ? User.find({ email: { $in: importEmails } }).lean() : []
    ]);

    const existingByEmpNumMap = new Map(existingByEmpNumDocs.map(u => [String(u.employeeNumber), u]));
    const emailToEmpNumMap = new Map(existingByEmailDocs.map(u => [String(u.email).toLowerCase(), String(u.employeeNumber)]));

    // Process each row with comprehensive error handling
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Skip empty rows
        if (!row || Object.keys(row).length === 0) {
          warnings.push(`Row ${i + 2}: Empty row skipped`);
          continue;
        }

        // Extract and validate employee data
        const employeeData = {
          employeeNumber: String(row.employeeNumber || row['Employee Number'] || '').trim(),
          name: (row.name || row['Name'] || '').trim(),
          email: (row.email || row['Email'] || '').trim().toLowerCase(),
          department: (row.department || row['Department'] || '').trim().toLowerCase(),
          designation: (row.designation || row['Designation'] || '').trim(),
          role: (row.role || row['Role'] || 'employee').trim().toLowerCase(),
          creditPoints: parseInt(row.creditPoints || row['Credit Points'] || 0) || 0,
          mobileNumber: String(row.mobileNumber || row['Mobile Number'] || '').trim()
        };

        // Validate required fields
        if (!employeeData.employeeNumber) {
          errors.push(`Row ${i + 2}: Employee Number is required`);
          continue;
        }
        if (!employeeData.name) {
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }
        if (!employeeData.email) {
          errors.push(`Row ${i + 2}: Email is required`);
          continue;
        }
        if (!employeeData.department) {
          errors.push(`Row ${i + 2}: Department is required`);
          continue;
        }
        if (!employeeData.designation) {
          errors.push(`Row ${i + 2}: Designation is required`);
          continue;
        }
        if (!employeeData.mobileNumber) {
          errors.push(`Row ${i + 2}: Mobile Number is required`);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(employeeData.email)) {
          errors.push(`Row ${i + 2}: Invalid email format`);
          continue;
        }

        // Validate role
        if (!['admin', 'reviewer', 'employee'].includes(employeeData.role)) {
          employeeData.role = 'employee';
          warnings.push(`Row ${i + 2}: Invalid role, defaulting to 'employee'`);
        }

        // Format mobile number - add +91 if not present
        if (employeeData.mobileNumber) {
          // Remove any existing +91, +, or leading zeros first
          let cleanNumber = employeeData.mobileNumber.replace(/^\+91|^\+|^0+/, '');
          
          // Add +91 prefix
          employeeData.mobileNumber = '+91' + cleanNumber;
        }

        // Validate mobile number format (should be +91 followed by 10 digits starting with 6-9)
        const mobileRegex = /^\+91[6-9]\d{9}$/;
        if (!mobileRegex.test(employeeData.mobileNumber)) {
          errors.push(`Row ${i + 2}: Invalid mobile number format. Should be +91 followed by 10 digits starting with 6-9`);
          continue;
        }

        // Check for duplicate email (with different employeeNumber) using preloaded maps
        const mappedEmpForEmail = emailToEmpNumMap.get(employeeData.email);
        if (mappedEmpForEmail && mappedEmpForEmail !== employeeData.employeeNumber) {
          errors.push(`Row ${i + 2}: Email already exists for employee ${mappedEmpForEmail}`);
          continue;
        }

        // Check for duplicate employee number with conflicting email using preloaded map
        const mappedEmpDoc = existingByEmpNumMap.get(employeeData.employeeNumber);
        if (mappedEmpDoc && String(mappedEmpDoc.email).toLowerCase() !== employeeData.email) {
          errors.push(`Row ${i + 2}: Employee Number already exists for different email`);
          continue;
        }

        // Create temporary user for validation
        const tempUser = new User(employeeData);
        await tempUser.validate();

        // Upsert (update if exists, create if new)
        const updated = await User.findOneAndUpdate(
          { employeeNumber: employeeData.employeeNumber },
          employeeData,
          { 
            upsert: true, 
            new: true, 
            runValidators: true,
            setDefaultsOnInsert: true
          }
        );

        results.push(updated);
        const action = existingByEmpNumMap.has(employeeData.employeeNumber) ? 'Updated' : 'Created';
        successes.push(`Row ${i + 2}: ${action} employee ${employeeData.name} (${employeeData.employeeNumber})`);

        // Update local maps to reflect this change for subsequent rows
        existingByEmpNumMap.set(employeeData.employeeNumber, updated);
        emailToEmpNumMap.set(employeeData.email, employeeData.employeeNumber);

      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.name === 'ValidationError') {
          const validationErrors = Object.values(error.errors).map(err => err.message);
          errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
        } else if (error.code === 11000) {
          errorMessage = 'Duplicate entry found';
        } else if (error.name === 'CastError') {
          errorMessage = `Invalid data type: ${error.message}`;
        }
        
        errors.push(`Row ${i + 2}: ${errorMessage}`);
      }
    }

    // Clean up uploaded file
    try {
      if (uploadedFilePath) {
        const fs = await import('fs');
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    // Return comprehensive results
    const response = {
      success: true,
      message: `Import completed. ${successes.length} succeeded, ${errors.length} failed${warnings.length > 0 ? `, ${warnings.length} warnings` : ''}.`,
      summary: {
        total: data.length,
        succeeded: successes.length,
        failed: errors.length,
        warnings: warnings.length
      },
      successes,
      errors,
      warnings,
      employees: results
    };

    res.json(response);

  } catch (error) {
    console.error('Bulk import error:', error);
    
    // Clean up uploaded file in case of error
    try {
      if (uploadedFilePath) {
        const fs = await import('fs');
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    // Return appropriate error response
    let errorMessage = 'An unexpected error occurred during import';
    let statusCode = 500;

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorMessage = 'Database error occurred';
      statusCode = 503;
    } else if (error.code === 'ENOENT') {
      errorMessage = 'File not found or corrupted';
      statusCode = 400;
    } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
      errorMessage = 'Too many open files. Please try again later';
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      errors: [error.message || 'Unknown error occurred']
    });
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