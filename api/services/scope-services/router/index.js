const express = require('express');
const router = express.Router();

const routes = [
  { path: '/', file: 'scope' },

  // Add more routes here as needed
];

router.get('/scopePing', (req, res) => {
  res.send({ message: 'Scope Service is Running' });
});

routes.forEach((route) => {
  router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
