import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  employeeNumber: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  department: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  role: { type: String, enum: ['admin', 'reviewer', 'employee'], default: 'employee' },
  creditPoints: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  mobileNumber: { type: String, required: true, trim: true },
  password: { type: String, required: function() { return this.role === 'admin' || this.role === 'reviewer'; } },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for faster searches
userSchema.index({ department: 1 });
userSchema.index({ creditPoints: -1 });
userSchema.index({ employeeNumber: 1 });
userSchema.index({ email: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('User', userSchema);