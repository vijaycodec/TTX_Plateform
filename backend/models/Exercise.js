const mongoose = require('mongoose');

const ArtifactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['log', 'alert', 'network', 'screenshot', 'document', 'other'],
    default: 'log'
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    timestamp: String,
    source: String,
    severity: String,
    eventId: String,
    alertId: String,
    additional: mongoose.Schema.Types.Mixed
  },
  order: Number
});

const PhaseQuestionSchema = new mongoose.Schema({
  phaseNumber: {
    type: Number,
    required: true
  },
  phaseName: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [{
    id: String,
    text: String,
    points: Number,
    magnitude: {
      type: String,
      enum: ['most_effective', 'effective', 'not_effective', 'somewhat_effective', 'least_effective'],
      default: 'least_effective'
    }
  }],
  correctAnswer: [String],
  questionType: {
    type: String,
    enum: ['single', 'multiple', 'text'],
    default: 'single'
  },
  maxPoints: Number,
  order: Number
});

const InjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  injectNumber: {
    type: Number,
    required: true
  },
  narrative: {
    type: String,
    required: true
  },
  artifacts: [ArtifactSchema],
  phases: [PhaseQuestionSchema],
  releaseTime: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  },
  responsesOpen: {
    type: Boolean,
    default: false
  },
  phaseProgressionLocked: {
    type: Boolean,
    default: false
  },
  order: Number
});

const ExerciseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  facilitator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessCode: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  injects: [InjectSchema],
  maxParticipants: {
    type: Number,
    default: 50
  },
  settings: {
    scoringEnabled: { type: Boolean, default: true },
    autoRelease: { type: Boolean, default: false },
    showScores: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// FIXED: Remove 'next' parameter
ExerciseSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Exercise', ExerciseSchema);