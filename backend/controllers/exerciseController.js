const Exercise = require('../models/Exercise');
const Participant = require('../models/Participant');
const { v4: uuidv4 } = require('uuid');

// @desc    Create new exercise
// @route   POST /api/exercises
// @access  Private (Facilitator)
exports.createExercise = async (req, res) => {
  try {
    const { title, description, maxParticipants, settings } = req.body;

    // Generate unique access code
    const accessCode = uuidv4().split('-')[0].toUpperCase();

    const exercise = await Exercise.create({
      title,
      description,
      facilitator: req.user.id,
      accessCode,
      maxParticipants: maxParticipants || 50,
      settings: settings || {
        scoringEnabled: true,
        autoRelease: false,
        showScores: true
      },
      injects: [] // Start with empty injects
    });

    res.status(201).json({
      success: true,
      exercise
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all exercises for facilitator
// @route   GET /api/exercises/my
// @access  Private (Facilitator)
exports.getMyExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find({ facilitator: req.user.id })
      .sort('-createdAt')
      .select('title description status accessCode createdAt');

    res.json(exercises);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single exercise
// @route   GET /api/exercises/:id
// @access  Private (Facilitator)
exports.getExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator of this exercise
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update exercise
// @route   PUT /api/exercises/:id
// @access  Private (Facilitator)
exports.updateExercise = async (req, res) => {
  try {
    let exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      exercise
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add inject to exercise
// @route   POST /api/exercises/:id/injects
// @access  Private (Facilitator)
exports.addInject = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, narrative, artifacts, phases } = req.body;
    
    // Determine inject number
    const injectNumber = exercise.injects.length + 1;

    const newInject = {
      title,
      injectNumber,
      narrative,
      artifacts: artifacts || [],
      phases: phases || [],
      order: injectNumber
    };

    exercise.injects.push(newInject);
    await exercise.save();

    res.status(201).json({
      success: true,
      inject: newInject
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update inject
// @route   PUT /api/exercises/:exerciseId/injects/:injectNumber
// @access  Private (Facilitator)
exports.updateInject = async (req, res) => {
  try {
    const { exerciseId, injectNumber } = req.params;
    
    const exercise = await Exercise.findById(exerciseId);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const injectIndex = exercise.injects.findIndex(
      inj => inj.injectNumber === parseInt(injectNumber)
    );

    if (injectIndex === -1) {
      return res.status(404).json({ message: 'Inject not found' });
    }

    // Update inject
    Object.assign(exercise.injects[injectIndex], req.body);
    await exercise.save();

    res.json({
      success: true,
      inject: exercise.injects[injectIndex]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Release inject to participants
// @route   POST /api/exercises/:id/release-inject
// @access  Private (Facilitator)
exports.releaseInject = async (req, res) => {
  try {
    console.log('=== RELEASE INJECT REQUEST ===');
    const { injectNumber } = req.body;
    const exerciseId = req.params.id;

    // Use direct update to avoid middleware issues
    const db = require('mongoose').connection.db;
    const ObjectId = require('mongoose').Types.ObjectId;

    // Update the inject directly
    const result = await db.collection('exercises').updateOne(
      {
        _id: new ObjectId(exerciseId),
        'injects.injectNumber': parseInt(injectNumber)
      },
      {
        $set: {
          'injects.$.isActive': true,
          'injects.$.releaseTime': new Date(),
          'injects.$.responsesOpen': true,
          'updatedAt': new Date()
        }
      }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Exercise or inject not found' });
    }

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'Inject already released or no changes made' });
    }

    // Update all active participants' currentInject to this inject number
    await db.collection('participants').updateMany(
      {
        exercise: new ObjectId(exerciseId),
        status: 'active'
      },
      {
        $set: {
          currentInject: parseInt(injectNumber),
          currentPhase: 1,  // Reset to phase 1 for new inject
          updatedAt: new Date()
        }
      }
    );

    console.log('Updated participants to inject', injectNumber);

    // Get the updated exercise
    const updatedExercise = await db.collection('exercises').findOne({
      _id: new ObjectId(exerciseId)
    });

    // Find the updated inject
    const releasedInject = updatedExercise.injects.find(
      inj => inj.injectNumber === parseInt(injectNumber)
    );

    // Emit socket event
    if (req.io) {
      req.io.to(`exercise-${exerciseId}`).emit('injectReleased', {
        injectNumber,
        inject: releasedInject
      });
      console.log('Socket event emitted for inject release');
    }

    res.json({
      success: true,
      message: `Inject ${injectNumber} released successfully`,
      inject: releasedInject
    });

  } catch (error) {
    console.error('❌ Error in releaseInject:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle response submission - FIXED VERSION
// @route   POST /api/exercises/:id/toggle-responses
// @access  Private (Facilitator)
exports.toggleResponses = async (req, res) => {
  try {
    const { injectNumber, responsesOpen } = req.body;
    const exerciseId = req.params.id;

    // Use direct MongoDB update
    const db = require('mongoose').connection.db;
    const ObjectId = require('mongoose').Types.ObjectId;

    const result = await db.collection('exercises').updateOne(
      {
        _id: new ObjectId(exerciseId),
        'injects.injectNumber': parseInt(injectNumber)
      },
      {
        $set: {
          'injects.$.responsesOpen': responsesOpen,
          'updatedAt': new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Exercise or inject not found' });
    }

    // Get updated exercise
    const updatedExercise = await db.collection('exercises').findOne({
      _id: new ObjectId(exerciseId)
    });

    const updatedInject = updatedExercise.injects.find(
      inj => inj.injectNumber === parseInt(injectNumber)
    );

    // Emit socket event
    if (req.io) {
      req.io.to(`exercise-${exerciseId}`).emit('responsesToggled', {
        injectNumber,
        responsesOpen
      });
    }

    res.json({
      success: true,
      message: `Responses ${responsesOpen ? 'opened' : 'closed'} for inject ${injectNumber}`,
      inject: updatedInject
    });
  } catch (error) {
    console.error('Error in toggleResponses:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle phase progression lock
// @route   POST /api/exercises/:id/toggle-phase-lock
// @access  Private (Facilitator)
exports.togglePhaseProgression = async (req, res) => {
  try {
    const { injectNumber, phaseProgressionLocked } = req.body;
    const exerciseId = req.params.id;

    console.log('Toggle phase progression:', { exerciseId, injectNumber, phaseProgressionLocked });

    // Use direct MongoDB update
    const db = require('mongoose').connection.db;
    const ObjectId = require('mongoose').Types.ObjectId;

    const result = await db.collection('exercises').updateOne(
      {
        _id: new ObjectId(exerciseId),
        'injects.injectNumber': parseInt(injectNumber)
      },
      {
        $set: {
          'injects.$.phaseProgressionLocked': phaseProgressionLocked,
          'updatedAt': new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Exercise or inject not found' });
    }

    // Get updated exercise
    const updatedExercise = await db.collection('exercises').findOne({
      _id: new ObjectId(exerciseId)
    });

    const updatedInject = updatedExercise.injects.find(
      inj => inj.injectNumber === parseInt(injectNumber)
    );

    // Emit socket event to all participants
    if (req.io) {
      req.io.to(`exercise-${exerciseId}`).emit('phaseProgressionToggled', {
        injectNumber,
        phaseProgressionLocked
      });
      console.log('Socket event emitted for phase progression toggle');
    }

    res.json({
      success: true,
      message: `Phase progression ${phaseProgressionLocked ? 'locked' : 'unlocked'} for inject ${injectNumber}`,
      inject: updatedInject
    });
  } catch (error) {
    console.error('Error in togglePhaseProgression:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get exercise participants
// @route   GET /api/exercises/:id/participants
// @access  Private (Facilitator)
exports.getParticipants = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const participants = await Participant.find({ 
      exercise: exercise._id 
    }).sort('-joinedAt');

    res.json(participants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get exercise scores
// @route   GET /api/exercises/:id/scores
// @access  Private (Facilitator)
exports.getScores = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const participants = await Participant.find({ 
      exercise: exercise._id,
      status: 'active'
    }).select('participantId name team totalScore responses');

    // Calculate leaderboard
    const leaderboard = participants
      .map(p => ({
        participantId: p.participantId,
        name: p.name,
        team: p.team,
        totalScore: p.totalScore,
        injectScores: calculateInjectScores(p.responses)
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    res.json({
      exerciseTitle: exercise.title,
      totalParticipants: participants.length,
      leaderboard,
      averageScore: participants.length > 0 
        ? participants.reduce((sum, p) => sum + p.totalScore, 0) / participants.length
        : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

function calculateInjectScores(responses) {
  const injectScores = {};
  
  responses.forEach(response => {
    const injectNum = response.injectNumber;
    if (!injectScores[injectNum]) {
      injectScores[injectNum] = 0;
    }
    injectScores[injectNum] += response.pointsEarned;
  });

  return injectScores;
}