const express = require("express");
const router = express.Router();
const path = require("path");
const { auth } = require("../../../communications/middleware/auth");
const { requireScope } = require("../../../communications/middleware/access");
const currentFileName = path.basename(__filename);
const controller = require(`../controller/${currentFileName}`);

// Dashboards + reports. activity_viewall → every developer; without it only the developer
// linked to the login. Common query: fromDate, toDate (YYYY-MM-DD, default last 7 days), developerId, teamId
const anyView = requireScope("mydashboard_view", "teamdashboard_view", "projectdashboard_view", "aiinsights_view", "report_view");
const projects = requireScope("projectdashboard_view");

router.get("/getScope", [auth], controller.getScope);
router.get("/getSummary", [auth, anyView], controller.getSummary);
router.get("/getDaily", [auth, anyView], controller.getDaily);
router.get("/getBreakdown", [auth, anyView], controller.getBreakdown); // + dimension, projectName, top
router.get("/getDevelopers", [auth, anyView], controller.getDevelopers);
router.get("/getAiModels", [auth, anyView], controller.getAiModels);
router.get("/getAgents", [auth, anyView], controller.getAgents);
router.get("/getHourly", [auth, anyView], controller.getHourly);
router.get("/getTimeline", [auth, anyView], controller.getTimeline); // developerId, date, sliceBy

// Live status + projects
router.get("/getLive", [auth, requireScope("teamdashboard_view", "projectdashboard_view", "mydashboard_view")], controller.getLive);
router.get("/getProjects", [auth, projects], controller.getProjects);
router.get("/getProjectDevelopers", [auth, projects], controller.getProjectDevelopers); // + projectName
router.get("/getProjectDaily", [auth, projects], controller.getProjectDaily);
router.get("/getProjectBranches", [auth, projects], controller.getProjectBranches);
router.get("/getProjectCommits", [auth, projects], controller.getProjectCommits); // + branch, top

module.exports = router;
