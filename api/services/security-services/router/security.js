const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

// Settings › Security. The token screens read the status too (to ask for the password).
router.get("/getSecurity", [auth], controller.getSecurity);
router.put("/setTokenPassword", [auth, requireScope("settings_update")], controller.setTokenPassword);
router.put("/setDeveloperSelfToken", [auth, requireScope("settings_update")], controller.setDeveloperSelfToken);

module.exports = router;
