const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope, selfOrScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

router.get("/getUsers", [auth, requireScope("user_view", "team_view", "team_update")], controller.getUsers);
router.post("/addUser", [auth, requireScope("user_create")], controller.addUser);
router.put("/updateUser/:id", [auth, requireScope("user_update")], controller.updateUser);
router.put("/updateProfile/:id", [auth, selfOrScope("user_update")], controller.updateProfile);
router.delete("/deleteUser/:id", [auth, requireScope("user_delete")], controller.deleteUser);

module.exports = router;
