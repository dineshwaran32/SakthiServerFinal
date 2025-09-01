import express from 'express';
import Idea from '../models/Idea.js';
import User from '../models/User.js';
import { authenticateToken, requireAdminOrReviewer } from '../middleware/auth.js';
import exceljs from 'exceljs';
import Notification from '../models/Notification.js';
import twilioService from '../twilioadminService.js';

const router = express.Router();

// Add new idea submission route
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Create new idea from request body
    const newIdea = new Idea({
      ...req.body,
      submittedByEmployeeNumber: req.user.employeeNumber,
      submittedByName: req.user.name,
      status: 'under_review',
      isActive: true
    });
    await newIdea.save();

    // Notify all admins only
    const admins = await User.find({ role: 'admin', isActive: true });
    const notifTitle = New Idea Submitted;
    const notifMsg = ${req.user.name} submitted a new idea: "${newIdea.title}";
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientEmployeeNumber: admin.employeeNumber,
        type: 'idea_submitted',
        title: notifTitle,
        message: notifMsg,
        relatedIdea: newIdea._id,
        isRead: false,
        priority: 'medium'
      });
    }

    res.status(201).json(newIdea);
  } catch (error) {
    console.error('Submit idea error:', error);
    res.status(500).json({ message: 'Failed to submit idea' });
  }
});

// Get all ideas with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      department,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    if (req.user.role === 'reviewer') {
      if (status === 'approved' || status === 'implemented') {
        // Show all approved/implemented ideas company-wide
        query.status = status;
        if (priority && priority !== 'all') {
          query.priority = priority;
        }
      } else if (status === 'under_review') {
        // Only show under_review ideas assigned to this reviewer
        query.status = 'under_review';
        query.assignedReviewer = req.user.employeeNumber;
        if (priority && priority !== 'all') {
          query.priority = priority;
        }
      } else if (status === 'ongoing') {
        // Only show ongoing ideas assigned to this reviewer
        query.status = 'ongoing';
        query.assignedReviewer = req.user.employeeNumber;
        if (priority && priority !== 'all') {
          query.priority = priority;
        }
      } else if (status === 'rejected') {
        // Only show rejected ideas in reviewer's department
        query.status = 'rejected';
        query.department = req.user.department;
        if (priority && priority !== 'all') {
          query.priority = priority;
        }
      } else if (!status || status === 'all' || status === '') {
        // For total/other, show all ideas in reviewer's department
        query.department = req.user.department;
        if (priority && priority !== 'all') {
          query.priority = priority;
        }
      } else {
        // Fallback: show ideas in reviewer's department with the given status
        query.department = req.user.department;
        query.status = status;
        if (priority && priority !== 'all') {
          query.priority = priority;
        }
      }
    } else {
      // Admin: unrestricted
      if (status && status !== 'all') {
        query.status = status;
      }
      if (department && department !== 'all') {
        query.department = department;
      }
      if (priority && priority !== 'all') {
        query.priority = priority;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { problem: { $regex: search, $options: 'i' } },
        { submittedByName: { $regex: search, $options: 'i' } },
        { submittedByEmployeeNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const ideas = await Idea.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Idea.countDocuments(query);
    const departments = await Idea.distinct('department', { isActive: true });
    const statuses = ['under_review', 'ongoing', 'approved', 'implemented', 'rejected'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    res.json({
      ideas,
      total,
      departments,
      statuses,
      priorities,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get ideas error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch notifications for the logged-in user
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientEmployeeNumber: req.user.employeeNumber })
      .sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientEmployeeNumber: req.user.employeeNumber },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ notification: notif });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientEmployeeNumber: req.user.employeeNumber, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'All notifications marked as read', updatedCount: result.modifiedCount });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get idea by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea || !idea.isActive) {
      return res.status(404).json({ message: 'Idea not found' });
    }
    res.json(idea);
  } catch (error) {
    console.error('Get idea error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update idea status
router.patch('/:id/status', authenticateToken, requireAdminOrReviewer, async (req, res) => {
  try {
    const { status, reviewComments, priority } = req.body;

    // Add role-based status validation
    if (req.user.role === 'reviewer') {
      // Reviewers can only set status to approved or rejected
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(403).json({ 
          message: 'Reviewers can only set status to approved or rejected'
        });
      }
    }
    // Admins can set any status (no restrictions needed)

    const updateData = {
      status,
      reviewedBy: req.user.name,
      reviewedAt: new Date()
    };

    if (reviewComments) {
      updateData.reviewComments = reviewComments;
    }

    if (priority) {
      updateData.priority = priority;
    }

    const idea = await Idea.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Notification logic
    let recipients = [];
    let notifTitle = '';
    let notifMsg = '';
    let notifType = null;
    if (status === 'under_review' || status === 'ongoing') {
      notifType = 'idea_implementing';
      notifTitle = Idea Status Updated: ${idea.title};
      notifMsg = The status of the idea "${idea.title}" has changed to ${status}.;
      // Notify Admins only
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id name employeeNumber mobileNumber');
      recipients = [...admins];
    } else if (status === 'approved') {
      notifType = 'idea_approved';
      notifTitle = Idea Status Updated: ${idea.title};
      notifMsg = The status of the idea "${idea.title}" has changed to approved.;
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id name employeeNumber mobileNumber');
      recipients = [...admins];
    } else if (status === 'implemented') {
      notifType = 'idea_implemented';
      notifTitle = Idea Status Updated: ${idea.title};
      notifMsg = The status of the idea "${idea.title}" has changed to implemented.;
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id name employeeNumber mobileNumber');
      recipients = [...admins];
    }
    // Create notifications
    for (const user of recipients) {
      await Notification.create({
        recipient: user._id,
        recipientEmployeeNumber: user.employeeNumber,
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        relatedIdea: idea._id,
        isRead: false,
        priority: 'medium'
      });

      // Send SMS to admin if they have a mobile number
      if (user.mobileNumber) {
        try {
          await twilioService.customMessage(
            user.mobileNumber,
            Status Update: The idea "${idea.title}" has been changed to ${status}.
          );
        } catch (smsErr) {
          console.error(Failed to send SMS to admin ${user.name}:, smsErr);
        }
      }
    }

    res.json(idea);
  } catch (error) {
    console.error('Update idea status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign a reviewer to an idea (admin only)
router.patch('/:id/assign-reviewer', authenticateToken, requireAdminOrReviewer, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign reviewers.' });
    }
    const { assignedReviewer } = req.body;
    if (!assignedReviewer) {
      return res.status(400).json({ message: 'assignedReviewer is required.' });
    }
    const idea = await Idea.findByIdAndUpdate(
      req.params.id,
      { assignedReviewer },
      { new: true }
    );
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }
    // Notify only the assigned reviewer
    const reviewer = await User.findOne({ employeeNumber: assignedReviewer, role: 'reviewer', isActive: true });
    if (reviewer) {
      await Notification.create({
        recipient: reviewer._id,
        recipientEmployeeNumber: reviewer.employeeNumber,
        type: 'review_assigned',
        title: Idea Assigned: ${idea.title},
        message: The idea "${idea.title}" has been assigned to you for review.,
        relatedIdea: idea._id,
        isRead: false,
        priority: 'medium'
      });
      // Send SMS notification to reviewer
      if (reviewer.mobileNumber) {
        try {
          await twilioService.customMessage(
            reviewer.mobileNumber,
            You have been assigned a new idea to review: "${idea.title} by admin"
          );
        } catch (smsErr) {
          console.error('Failed to send SMS to reviewer:', smsErr);
        }
      }
    }
    res.json(idea);
  } catch (error) {
    console.error('Assign reviewer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get idea statistics
router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    let totalIdeas, underReview, approved, implemented, rejected, ongoing;
    if (req.user.role === 'reviewer') {
      // Reviewer-specific stats
      totalIdeas = await Idea.countDocuments({ isActive: true, department: req.user.department });
      underReview = await Idea.countDocuments({ isActive: true, status: 'under_review', assignedReviewer: req.user.employeeNumber });
      approved = await Idea.countDocuments({ isActive: true, status: 'approved' }); // company-wide
      implemented = await Idea.countDocuments({ isActive: true, status: 'implemented' }); // company-wide
      rejected = await Idea.countDocuments({ isActive: true, status: 'rejected', department: req.user.department });
      ongoing = await Idea.countDocuments({ isActive: true, status: 'ongoing', department: req.user.department });
    } else {
      // Admin: all stats
      totalIdeas = await Idea.countDocuments({ isActive: true });
      underReview = await Idea.countDocuments({ status: 'under_review', isActive: true });
      approved = await Idea.countDocuments({ status: 'approved', isActive: true });
      implemented = await Idea.countDocuments({ status: 'implemented', isActive: true });
      rejected = await Idea.countDocuments({ status: 'rejected', isActive: true });
      ongoing = await Idea.countDocuments({ status: 'ongoing', isActive: true });
    }

    // The rest of the stats (distribution, departmentStats, monthlyTrends) can remain as is for both roles
    const statusDistribution = await Idea.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const departmentStats = await Idea.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const monthlyTrends = await Idea.aggregate([
      { $match: { isActive: true, createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      totalIdeas,
      underReview,
      approved,
      implemented,
      rejected,
      ongoing,
      statusDistribution,
      departmentStats,
      monthlyTrends
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export ideas as Excel
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      department,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 1000
    } = req.query;

    const query = { isActive: true };
    if (status && status !== 'all') query.status = status;
    if (department && department !== 'all') query.department = department;
    if (priority && priority !== 'all') query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { problem: { $regex: search, $options: 'i' } },
        { submittedByName: { $regex: search, $options: 'i' } },
        { submittedByEmployeeNumber: { $regex: search, $options: 'i' } }
      ];
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const ideas = await Idea.find(query)
      .sort(sort)
      .limit(Number(limit))
      .lean();

    // Collect all reviewedBy values that look like ObjectIds
    const reviewerIds = ideas
      .map(idea => idea.reviewedBy)
      .filter(val => val && /^[0-9a-fA-F]{24}$/.test(val));
    let reviewerMap = {};
    if (reviewerIds.length > 0) {
      const users = await User.find({ _id: { $in: reviewerIds } }).lean();
      reviewerMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));
    }

    // Collect all employee numbers that are missing names
    const missingNames = ideas
      .filter(idea => !idea.submittedByName && idea.submittedByEmployeeNumber)
      .map(idea => idea.submittedByEmployeeNumber);

    let employeeMap = {};
    if (missingNames.length > 0) {
      const users = await User.find({ employeeNumber: { $in: missingNames } }).lean();
      employeeMap = Object.fromEntries(users.map(u => [u.employeeNumber, u.name]));
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Ideas');
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Employee ID', key: 'submittedByEmployeeNumber', width: 15 },
      { header: 'Employee Name', key: 'submittedByName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Submitted Date', key: 'createdAt', width: 20 },
      { header: 'Reviewed By', key: 'reviewedBy', width: 20 },
      { header: 'Review Comments', key: 'reviewComments', width: 30 },
      { header: 'Estimated Savings', key: 'estimatedSavings', width: 18 }
    ];
    ideas.forEach(idea => {
      worksheet.addRow({
        title: idea.title || '',
        department: idea.department || '',
        submittedByEmployeeNumber: idea.submittedByEmployeeNumber || '',
        submittedByName: idea.submittedByName || employeeMap[idea.submittedByEmployeeNumber] || '',
        status: idea.status || '',
        priority: idea.priority || '',
        createdAt: idea.createdAt ? new Date(idea.createdAt).toLocaleString() : '',
        reviewedBy: reviewerMap[idea.reviewedBy] || idea.reviewedBy || '',
        reviewComments: idea.reviewComments || '',
        estimatedSavings: idea.estimatedSavings || '',
      });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ideas.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export ideas error:', error);
    res.status(500).json({ message: 'Failed to export ideas' });
  }
});

export default router;