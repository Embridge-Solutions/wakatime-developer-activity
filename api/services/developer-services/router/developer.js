const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

// Developer (WakaTime) side of users — the screens manage it through Users; kept for the API
router.get("/getDevelopers", [auth, requireScope("activity_viewall", "user_view", "token_view")], controller.getDevelopers);
router.get("/getDeveloper/:id", [auth, requireScope("activity_viewall", "user_view", "token_view")], controller.getDeveloper);
router.post("/addDeveloper", [auth, requireScope("user_create")], controller.addDeveloper);
router.put("/updateDeveloper/:id", [auth, requireScope("user_update")], controller.updateDeveloper);
router.put("/updateStatus/:id", [auth, requireScope("user_update")], controller.updateStatus);
router.delete("/deleteDeveloper/:id", [auth, requireScope("user_delete")], controller.deleteDeveloper);

// WakaTime API key (API key screen)
router.post("/verifyApiKey", [auth, requireScope("token_update", "user_create", "user_update")], controller.verifyApiKey);
router.put("/updateApiKey/:id", [auth, requireScope("token_update")], controller.updateApiKey);
router.delete("/removeApiKey/:id", [auth, requireScope("token_update")], controller.removeApiKey);

module.exports = router;
