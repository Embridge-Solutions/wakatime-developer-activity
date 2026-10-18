const express = require("express");
const { route } = require(".");
const router = express.Router();

//get controller path
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controllerFileName = require(`../controller/${currentFileName}`);

router.get("/getScopes", [auth, requireScope("role_view", "user_create", "user_update")], controllerFileName.getScopes);

module.exports = router;
