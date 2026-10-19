const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

const view = requireScope("settings_view", "settings_update");
const update = requireScope("settings_update");

// Settings › Mail Server, Weekly Reports, Welcome Mail, Mail History
router.get("/getSettings", [auth, view], controller.getSettings);
router.put("/updateSetting/:mailType", [auth, update], controller.updateSetting);
router.get("/getSmtpStatus", [auth, view], controller.getSmtpStatus);
router.post("/testSmtp", [auth, update], controller.testSmtp);
router.post("/preview", [auth, view], controller.preview);
router.post("/sendTest", [auth, update], controller.sendTest);
router.post("/sendWeeklyNow", [auth, update], controller.sendWeeklyNow);
router.get("/getMailLogs", [auth, view], controller.getMailLogs);

// Users list → send the welcome mail again
router.post("/sendWelcome/:userId", [auth, requireScope("user_create", "user_update")], controller.sendWelcome);

module.exports = router;
