const express = require("express");
const { route } = require(".");
const router = express.Router();

//get controller path
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controllerFileName = require(`../controller/${currentFileName}`);

// The user form lists roles too, so user_create / user_update can read them
router.get("/getRoles", [auth, requireScope("role_view", "user_create", "user_update")], controllerFileName.getRoles);
router.post("/addRole", [auth, requireScope("role_create")], controllerFileName.addRole);
router.put("/updateRole/:id", [auth, requireScope("role_update")], controllerFileName.updateRole);
router.delete("/deleteRole/:id", [auth, requireScope("role_delete")], controllerFileName.deleteRole);

module.exports = router;
