import mongoose from 'mongoose';

const ideaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  problem: {
    type: String,
    required: true,
    trim: true
  },
  improvement: {
    type: String,
    required: true,
    trim: true
  },
  benefit: {
    type: String,
    required: true,
    trim: true
  },
  estimatedSavings: {
    type: Number,
    default: 0,
    min: 0
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  submittedByEmployeeNumber: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  submittedByName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['under_review', 'ongoing', 'approved', 'implemented', 'rejected'],
    default: 'under_review'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  reviewedBy: {
    type: String,
    trim: true
  },
  assignedReviewer: {
    type: String, // employeeNumber or user ID of the reviewer
    trim: true,
    default: ''
  },
  reviewComments: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    size: Number
  }],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster searches
ideaSchema.index({ status: 1 });
ideaSchema.index({ department: 1 });
ideaSchema.index({ submittedByEmployeeNumber: 1 });
ideaSchema.index({ priority: 1 });

export default mongoose.model('Idea', ideaSchema);