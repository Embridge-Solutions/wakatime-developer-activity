const express = require('express');
const router = express.Router();

const routes = [
  { path: '/', file: 'auth' },

  // Add more routes here as needed
];

router.get('/authPing', (req, res) => {
  res.send({ message: 'Auth Service is Running' });
});

routes.forEach((route) => {
  router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
