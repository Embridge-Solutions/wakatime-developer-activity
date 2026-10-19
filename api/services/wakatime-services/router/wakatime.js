const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

router.post("/syncNow", [auth, requireScope("sync_run")], controller.syncNow);
router.get("/getSyncStatus", [auth, requireScope("sync_view", "sync_run")], controller.getSyncStatus);
router.get("/getSyncRuns", [auth, requireScope("sync_view", "sync_run")], controller.getSyncRuns);
router.get("/getSyncLogs", [auth, requireScope("sync_view", "sync_run")], controller.getSyncLogs);
router.get("/getConfig", [auth, requireScope("settings_view", "settings_update", "sync_view")], controller.getConfig);

module.exports = router;
