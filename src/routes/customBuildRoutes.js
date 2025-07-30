const express = require('express');
const router = express.Router();
const customBuildController = require('../controllers/customBuildController');

// POST /api/custom-builds
router.post('/', customBuildController.createCustomBuild);

// GET /api/custom-builds/user/:userId
router.get('/user/:userId', customBuildController.getBuildsByUser);

// GET /api/custom-builds/:id
router.get('/:id', customBuildController.getBuildById);

module.exports = router;
