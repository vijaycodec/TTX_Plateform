const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['facilitator', 'admin'],
    default: 'facilitator'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// REMOVED the pre-save hook - we'll handle hashing in the controller

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  // We'll implement this in authController instead
  return candidatePassword === this.password; // Temporary - we'll fix in auth
};

module.exports = mongoose.model('User', UserSchema);