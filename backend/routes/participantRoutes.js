const express = require('express');
const router = express.Router();
const {
  joinExercise,
  getExerciseData,
  submitResponse,
  nextPhase,
  updateParticipantStatus
} = require('../controllers/participantController');
const { protect, facilitatorOnly } = require('../middlewares/auth');

// Public routes (no auth required)
router.post('/join', joinExercise);
router.post('/exercise/:exerciseId', getExerciseData);
router.post('/submit-response', submitResponse);
router.post('/next-phase', nextPhase);

// Protected routes (facilitator only)
router.put('/:participantId/status', protect, facilitatorOnly, updateParticipantStatus);

module.exports = router;