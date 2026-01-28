const express = require('express');
const router = express.Router();
const {
  createExercise,
  getMyExercises,
  getExercise,
  updateExercise,
  addInject,
  updateInject,
  deleteExercise,
  deleteInject,
  releaseInject,
  toggleResponses,
  togglePhaseProgression,
  getParticipants,
  getScores,
  resetExercise,
  resetInject
} = require('../controllers/exerciseController');
const { protect, facilitatorOnly } = require('../middlewares/auth');

// All routes require authentication and facilitator role
router.use(protect);
router.use(facilitatorOnly);

router.route('/')
  .post(createExercise);

router.route('/my')
  .get(getMyExercises);

router.route('/:id')
  .get(getExercise)
  .put(updateExercise)
  .delete(deleteExercise);

router.route('/:id/injects')
  .post(addInject);

router.route('/:exerciseId/injects/:injectNumber')
  .put(updateInject)
  .delete(deleteInject);

router.route('/:id/release-inject')
  .post(releaseInject);

router.route('/:id/toggle-responses')
  .post(toggleResponses);

router.route('/:id/toggle-phase-lock')
  .post(togglePhaseProgression);

router.route('/:id/participants')
  .get(getParticipants);

router.route('/:id/scores')
  .get(getScores);

router.route('/:id/reset')
  .post(resetExercise);

router.route('/:id/reset-inject')
  .post(resetInject);

module.exports = router;