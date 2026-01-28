const Exercise = require('../models/Exercise');
const Participant = require('../models/Participant');
const { v4: uuidv4 } = require('uuid');

// @desc    Join exercise as participant
// @route   POST /api/participants/join
// @access  Public
// @desc    Join exercise as participant
// @route   POST /api/participants/join
// @access  Public
exports.joinExercise = async (req, res) => {
  try {
    console.log('=== JOIN EXERCISE REQUEST ===');
    console.log('Request body:', req.body);
    const { accessCode, name, team } = req.body;

    if (!accessCode) {
      console.log('No access code provided');
      return res.status(400).json({ 
        message: 'Access code is required' 
      });
    }

    // Find exercise by access code
    console.log('Looking for exercise with access code:', accessCode);
    const exercise = await Exercise.findOne({ 
      accessCode: accessCode.toUpperCase(),
      status: { $in: ['active', 'draft'] }
    });

    if (!exercise) {
      console.log('Exercise not found with access code:', accessCode);
      return res.status(404).json({ 
        message: 'Exercise not found or not active' 
      });
    }

    console.log('Exercise found:', exercise.title);
    console.log('Exercise ID:', exercise._id);
    console.log('Exercise status:', exercise.status);

    // Check if exercise is full
    const participantCount = await Participant.countDocuments({ 
      exercise: exercise._id,
      status: { $in: ['active', 'waiting'] }
    });

    console.log('Current participants:', participantCount);
    console.log('Max participants:', exercise.maxParticipants);

    if (participantCount >= exercise.maxParticipants) {
      console.log('Exercise is full');
      return res.status(400).json({ 
        message: 'Exercise is full. Maximum participants reached.' 
      });
    }

    // Generate unique participant ID
    const { v4: uuidv4 } = require('uuid');
    const participantId = uuidv4();

    console.log('Creating participant with ID:', participantId);

    const participant = await Participant.create({
      participantId,
      name: name || 'Anonymous',
      team: team || 'Individual',
      exercise: exercise._id,
      status: 'waiting'
    });

    console.log('Participant created successfully:', participant.participantId);

    // Emit socket event to notify facilitator
    if (req.io) {
      const roomName = `exercise-${exercise._id}`;
      req.io.to(roomName).emit('participantJoined', {
        participant: {
          participantId: participant.participantId,
          name: participant.name,
          team: participant.team,
          status: participant.status,
          joinedAt: participant.joinedAt
        }
      });
      console.log(`📡 Socket event emitted: participantJoined to room ${roomName}`);
      console.log(`  ➡️ Participant: ${participant.name} (${participant.participantId})`);
    }

    res.status(201).json({
      success: true,
      participant: {
        participantId: participant.participantId,
        name: participant.name,
        team: participant.team,
        exerciseId: exercise._id,
        exerciseTitle: exercise.title,
        status: participant.status
      }
    });

    console.log('=== JOIN EXERCISE COMPLETE ===');

  } catch (error) {
    console.error('❌ Error in joinExercise:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get exercise data for participant
// @route   GET /api/participants/exercise/:exerciseId
// @access  Public (with participantId in body)
exports.getExerciseData = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { participantId } = req.body;

    console.log('Getting exercise data for:', { exerciseId, participantId });

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    const participant = await Participant.findOne({
      participantId,
      exercise: exerciseId
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Get current inject - find the active inject or the one participant is on
    let currentInject = exercise.injects.find(
      inject => inject.injectNumber === participant.currentInject && inject.isActive
    );

    // If no current inject, get the latest active inject
    if (!currentInject) {
      const activeInjects = exercise.injects.filter(inject => inject.isActive);
      currentInject = activeInjects.length > 0 ? activeInjects[activeInjects.length - 1] : null;
    }

    console.log('Current inject:', currentInject?.title);
    console.log('Inject has phases:', currentInject?.phases?.length || 0);
    console.log('Participant current phase:', participant.currentPhase || 1);

    // Get only active injects
    const activeInjects = exercise.injects.filter(
      inject => inject.isActive
    );

    // Get phases from current inject
    const phases = currentInject ? currentInject.phases : [];

    // Get current phase number (default to 1 if not set)
    const currentPhase = participant.currentPhase || 1;

    res.json({
      exercise: {
        id: exercise._id,
        title: exercise.title,
        description: exercise.description,
        settings: exercise.settings
      },
      participant: {
        participantId: participant.participantId,
        name: participant.name,
        currentInject: participant.currentInject,
        currentPhase: currentPhase,
        totalScore: participant.totalScore,
        status: participant.status,
        responses: participant.responses || []
      },
      currentInject: currentInject || null,
      activeInjects,
      phases,
      currentPhaseNumber: currentPhase,
      responsesOpen: currentInject ? currentInject.responsesOpen : false,
      phaseProgressionLocked: currentInject ? currentInject.phaseProgressionLocked : false
    });
  } catch (error) {
    console.error('Error in getExerciseData:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Submit response
// @route   POST /api/participants/submit-response
// @access  Public (with participantId in body)
exports.submitResponse = async (req, res) => {
  try {
    const { participantId, exerciseId, injectNumber, phaseNumber, questionIndex, answer } = req.body;

    // Validate input
    if (!participantId || !exerciseId || !injectNumber || !phaseNumber || questionIndex === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    const participant = await Participant.findOne({ 
      participantId,
      exercise: exerciseId 
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Check if responses are open for this inject
    const inject = exercise.injects.find(
      inj => inj.injectNumber === injectNumber
    );

    if (!inject || !inject.responsesOpen) {
      return res.status(400).json({ 
        message: 'Responses are not open for this inject' 
      });
    }

    // Check if participant has already answered this question
    const existingResponse = participant.responses.find(
      resp => resp.injectNumber === injectNumber && 
              resp.phaseNumber === phaseNumber && 
              resp.questionIndex === questionIndex
    );

    if (existingResponse) {
      return res.status(400).json({ 
        message: 'Response already submitted for this question' 
      });
    }

    // Calculate points and magnitude
    const phaseQuestion = inject.phases.find(
      p => p.phaseNumber === phaseNumber
    );

    let pointsEarned = 0;
    let magnitude = 'least_effective';
    if (phaseQuestion) {
      const result = calculatePointsAndMagnitude(phaseQuestion, answer);
      pointsEarned = result.pointsEarned;
      magnitude = result.magnitude;
      console.log('Score calculation:', {
        phaseNumber,
        questionType: phaseQuestion.questionType,
        answer,
        correctAnswer: phaseQuestion.correctAnswer,
        pointsEarned,
        magnitude
      });
    }

    // Add response
    participant.responses.push({
      injectNumber,
      phaseNumber,
      questionIndex,
      answer,
      pointsEarned,
      magnitude
    });

    // Update total score
    participant.totalScore += pointsEarned;
    await participant.save();

    // Emit socket event for real-time score updates
    if (req.io) {
      const roomName = `exercise-${exerciseId}`;
      req.io.to(roomName).emit('scoreUpdate', {
        participantId,
        name: participant.name,
        totalScore: participant.totalScore,
        injectNumber,
        pointsEarned,
        magnitude
      });
      console.log(`📡 Socket event emitted: scoreUpdate to room ${roomName}`);
      console.log(`  ➡️ ${participant.name} earned ${pointsEarned} points (magnitude: ${magnitude}, total: ${participant.totalScore})`);
    }

    res.json({
      success: true,
      pointsEarned,
      magnitude,
      totalScore: participant.totalScore
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Move to next phase
// @route   POST /api/participants/next-phase
// @access  Public (with participantId in body)
exports.nextPhase = async (req, res) => {
  try {
    const { participantId, exerciseId, currentInjectNumber, currentPhaseNumber } = req.body;

    console.log('Next phase request:', { participantId, exerciseId, currentInjectNumber, currentPhaseNumber });

    const participant = await Participant.findOne({
      participantId,
      exercise: exerciseId
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Find the current inject
    const currentInject = exercise.injects.find(
      inj => inj.injectNumber === currentInjectNumber
    );

    if (!currentInject) {
      return res.status(404).json({ message: 'Current inject not found' });
    }

    // Check if phase progression is locked by facilitator
    if (currentInject.phaseProgressionLocked) {
      return res.status(403).json({
        message: 'Phase progression is currently locked. Please wait for the facilitator to unlock it.',
        locked: true
      });
    }

    // Check if there's a next phase
    const nextPhaseNumber = currentPhaseNumber + 1;
    const totalPhases = currentInject.phases.length;

    if (nextPhaseNumber > totalPhases) {
      // No more phases in this inject
      return res.json({
        success: true,
        message: 'All phases completed for this inject',
        allPhasesCompleted: true,
        currentPhase: currentPhaseNumber
      });
    }

    // Update participant's current phase
    participant.currentPhase = nextPhaseNumber;
    await participant.save();

    console.log(`Participant ${participantId} moved to phase ${nextPhaseNumber}`);

    res.json({
      success: true,
      currentPhase: nextPhaseNumber,
      totalPhases: totalPhases,
      allPhasesCompleted: false
    });

  } catch (error) {
    console.error('Error in nextPhase:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update participant status (admit/reject)
// @route   PUT /api/participants/:participantId/status
// @access  Private (Facilitator)
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { participantId } = req.params;

    const participant = await Participant.findOne({ participantId });
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Get exercise to verify facilitator
    const exercise = await Exercise.findById(participant.exercise);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if user is facilitator
    if (exercise.facilitator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    participant.status = status;
    
    // If admitting, set current inject to 1
    if (status === 'active') {
      participant.currentInject = 1;
    }

    await participant.save();

    // Emit socket event to participant
    if (status === 'active') {
      const participantRoom = `participant-${participantId}`;
      req.io.to(participantRoom).emit('participantAdmitted', {
        exerciseId: exercise._id,
        exerciseTitle: exercise.title
      });
      console.log(`📡 Socket event emitted: participantAdmitted to room ${participantRoom}`);
      console.log(`  ➡️ Participant: ${participant.name} admitted to ${exercise.title}`);
    }

    // Emit socket event to facilitator to update participant list
    if (req.io) {
      const exerciseRoom = `exercise-${exercise._id}`;
      req.io.to(exerciseRoom).emit('participantStatusUpdated', {
        participantId,
        status,
        participant: {
          participantId: participant.participantId,
          name: participant.name,
          team: participant.team,
          status: participant.status,
          currentInject: participant.currentInject,
          totalScore: participant.totalScore
        }
      });
      console.log(`📡 Socket event emitted: participantStatusUpdated to room ${exerciseRoom}`);
      console.log(`  ➡️ Participant: ${participant.name} status = ${status}`);
    }

    res.json({
      success: true,
      participant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate points and magnitude
function calculatePointsAndMagnitude(question, answer) {
  if (question.questionType === 'single') {
    // For single choice, answer is a string (option ID)
    // Find the selected option to get its points and magnitude
    const selectedOption = question.options?.find(opt => opt.id === answer);
    if (selectedOption) {
      return {
        pointsEarned: selectedOption.points || 0,
        magnitude: selectedOption.magnitude || 'least_effective'
      };
    }
    return { pointsEarned: 0, magnitude: 'least_effective' };
  }

  if (question.questionType === 'multiple') {
    // For multiple choice, answer is an array of option IDs
    // Calculate total points from all selected options
    if (!Array.isArray(answer)) {
      return { pointsEarned: 0, magnitude: 'least_effective' };
    }

    let totalPoints = 0;
    let magnitudes = [];

    answer.forEach(optionId => {
      const option = question.options?.find(opt => opt.id === optionId);
      if (option) {
        totalPoints += (option.points || 0);
        magnitudes.push(option.magnitude || 'least_effective');
      }
    });

    // Determine overall magnitude based on total points
    let overallMagnitude = 'least_effective';
    if (totalPoints >= 9) {
      overallMagnitude = 'most_effective';
    } else if (totalPoints >= 7) {
      overallMagnitude = 'effective';
    } else if (totalPoints >= 5) {
      overallMagnitude = 'not_effective';
    } else if (totalPoints >= 2) {
      overallMagnitude = 'somewhat_effective';
    }

    return {
      pointsEarned: totalPoints,
      magnitude: overallMagnitude
    };
  }

  // For text questions or other types
  return { pointsEarned: question.maxPoints || 5, magnitude: 'not_effective' };
}