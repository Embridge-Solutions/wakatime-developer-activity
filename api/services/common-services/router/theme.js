const express = require('express');
const router = express.Router();

//get controller path
const path = require('path');
const { auth } = require('../../../communications/middleware/auth');
const currentFileName = path.basename(__filename);
const controllerFileName = require(`../controller/${currentFileName}`);
const upload = require('../../../utils/upload');

// Theme routes
router.get('/getTheme', controllerFileName.getTheme);
router.put('/updateTheme', [auth], controllerFileName.updateTheme); // admin only (checked in controller)
router.post('/uploadLogo', [auth, upload.single('logo')], controllerFileName.uploadLogo); // admin only

module.exports = router;
