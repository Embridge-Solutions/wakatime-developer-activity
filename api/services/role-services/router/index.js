const express = require('express');
const router = express.Router();

const routes = [
  { path: '/', file: 'role' },

  // Add more routes here as needed
];

router.get('/rolePing', (req, res) => {
  res.send({ message: 'Role Service is Running' });
});

routes.forEach((route) => {
  router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
