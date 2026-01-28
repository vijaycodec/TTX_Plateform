const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  injectNumber: Number,
  phaseNumber: Number,
  questionIndex: Number,
  answer: mongoose.Schema.Types.Mixed,
  pointsEarned: {
    type: Number,
    default: 0
  },
  magnitude: {
    type: String,
    enum: ['most_effective', 'effective', 'not_effective', 'somewhat_effective', 'least_effective'],
    default: 'least_effective'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const ParticipantSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: 'Anonymous'
  },
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  team: String,
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'left'],
    default: 'waiting'
  },
  currentInject: {
    type: Number,
    default: 1
  },
  currentPhase: {
    type: Number,
    default: 1
  },
  responses: [ResponseSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  socketId: String
});

// FIXED: Remove 'next' parameter
ParticipantSchema.pre('save', function() {
  this.lastActivity = Date.now();
});

module.exports = mongoose.model('Participant', ParticipantSchema);