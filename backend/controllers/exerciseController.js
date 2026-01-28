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
      const roomName = `exercise-${exerciseId}`;
      const eventData = {
        injectNumber: parseInt(injectNumber),
        inject: releasedInject
      };
      req.io.to(roomName).emit('injectReleased', eventData);
      console.log(`📡 Socket event emitted: injectReleased to room ${roomName}`);
      console.log(`  ➡️ Inject ${injectNumber} released`);
      console.log(`  ➡️ Event data:`, eventData);
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
      const roomName = `exercise-${exerciseId}`;
      const eventData = {
        injectNumber: parseInt(injectNumber),
        responsesOpen: responsesOpen
      };
      req.io.to(roomName).emit('responsesToggled', eventData);
      console.log(`📡 Socket event emitted: responsesToggled to room ${roomName}`);
      console.log(`  ➡️ Inject ${injectNumber}: responsesOpen = ${responsesOpen}`);
      console.log(`  ➡️ Event data:`, eventData);
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
      const roomName = `exercise-${exerciseId}`;
      const eventData = {
        injectNumber: parseInt(injectNumber),
        phaseProgressionLocked: phaseProgressionLocked
      };
      req.io.to(roomName).emit('phaseProgressionToggled', eventData);
      console.log(`📡 Socket event emitted: phaseProgressionToggled to room ${roomName}`);
      console.log(`  ➡️ Inject ${injectNumber}: phaseProgressionLocked = ${phaseProgressionLocked}`);
      console.log(`  ➡️ Event data:`, eventData);
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

// @desc    Delete exercise
// @route   DELETE /api/exercises/:id
// @access  Private (Facilitator)
exports.deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete all associated participants
    await Participant.deleteMany({ exercise: exercise._id });

    // Delete the exercise
    await Exercise.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Exercise and associated participants deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete inject
// @route   DELETE /api/exercises/:exerciseId/injects/:injectNumber
// @access  Private (Facilitator)
exports.deleteInject = async (req, res) => {
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

    // Remove the inject
    exercise.injects.splice(injectIndex, 1);

    // Renumber remaining injects
    exercise.injects.forEach((inject, index) => {
      inject.injectNumber = index + 1;
      inject.order = index + 1;
    });

    await exercise.save();

    res.json({
      success: true,
      message: 'Inject deleted and remaining injects renumbered successfully',
      injects: exercise.injects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset exercise - clear all participant responses, scores, and inject states
// @route   POST /api/exercises/:id/reset
// @access  Private (Facilitator)
exports.resetExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Reset all injects back to inactive state
    const db = require('mongoose').connection.db;
    const ObjectId = require('mongoose').Types.ObjectId;

    await db.collection('exercises').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          'injects.$[].isActive': false,
          'injects.$[].releaseTime': null,
          'injects.$[].responsesOpen': false,
          'injects.$[].phaseProgressionLocked': false,
          'updatedAt': new Date()
        }
      }
    );

    // Reset all participants - clear responses, scores, reset phase
    await Participant.updateMany(
      { exercise: exercise._id },
      {
        $set: {
          responses: [],
          totalScore: 0,
          currentInject: 1,
          currentPhase: 1,
          lastActivity: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Exercise reset successfully. All responses and scores cleared.'
    });
  } catch (error) {
    console.error('Error resetting exercise:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset specific inject - clear responses for that inject only
// @route   POST /api/exercises/:id/reset-inject
// @access  Private (Facilitator)
exports.resetInject = async (req, res) => {
  try {
    const { injectNumber } = req.body;
    const exerciseId = req.params.id;

    const exercise = await Exercise.findById(exerciseId);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Reset the specific inject state
    const db = require('mongoose').connection.db;
    const ObjectId = require('mongoose').Types.ObjectId;

    await db.collection('exercises').updateOne(
      {
        _id: new ObjectId(exerciseId),
        'injects.injectNumber': parseInt(injectNumber)
      },
      {
        $set: {
          'injects.$.isActive': false,
          'injects.$.releaseTime': null,
          'injects.$.responsesOpen': false,
          'injects.$.phaseProgressionLocked': false,
          'updatedAt': new Date()
        }
      }
    );

    // Remove participant responses for this inject only
    await Participant.updateMany(
      { exercise: exercise._id },
      {
        $pull: {
          responses: { injectNumber: parseInt(injectNumber) }
        }
      }
    );

    // Recalculate total scores for all participants
    const participants = await Participant.find({ exercise: exercise._id });
    for (const participant of participants) {
      const totalScore = participant.responses.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
      await Participant.updateOne(
        { _id: participant._id },
        { $set: { totalScore } }
      );
    }

    res.json({
      success: true,
      message: `Inject ${injectNumber} reset successfully.`
    });
  } catch (error) {
    console.error('Error resetting inject:', error);
    res.status(500).json({ message: 'Server error' });
  }
};