const express = require('express');
const router = express.Router();

const routes = [
  { path: '/theme', file: 'theme' },

  // Add more routes here as needed
];

router.get('/commonRouterPing', (req, res) => {
  res.send({ message: 'Common Router Service is Running' });
});

routes.forEach((route) => {
  router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
