const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

// The user form and the dashboard team filter read the list too
router.get("/getTeams", [auth, requireScope("team_view", "user_create", "user_update", "activity_viewall")], controller.getTeams);
router.post("/addTeam", [auth, requireScope("team_create")], controller.addTeam);
router.put("/updateTeam/:id", [auth, requireScope("team_update")], controller.updateTeam);
router.delete("/deleteTeam/:id", [auth, requireScope("team_delete")], controller.deleteTeam);

module.exports = router;
