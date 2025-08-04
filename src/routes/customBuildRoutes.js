const express = require('express');
const router = express.Router();
const customBuildController = require('../controllers/customBuildController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/create',verifyToken, customBuildController.createCustomBuild);
router.get('/user/:userId',verifyToken, customBuildController.getBuildsByUser);
router.get('/:id', verifyToken,customBuildController.getBuildById);
router.put('/:id',verifyToken, customBuildController.updateBuildById);
router.delete('/:id',verifyToken, customBuildController.deleteBuildById);

module.exports = router;
