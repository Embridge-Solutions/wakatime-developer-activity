const express = require('express');
const { route } = require('.');
const router = express.Router();

//get controller path
const path = require('path');
const currentFileName = path.basename(__filename);
const controllerFileName = require(`../controller/${currentFileName}`);

router.post('/login', controllerFileName.login);
router.post('/logout', controllerFileName.logout);
router.put('/update-password', controllerFileName.updatePassword);
router.post('/verify-user', controllerFileName.verifyUser);
router.post('/forgot-password', controllerFileName.forgotPassword);
router.post('/refresh', controllerFileName.refreshToken);


module.exports = router;
