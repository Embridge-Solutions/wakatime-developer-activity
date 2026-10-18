const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'developer' },
];

router.get('/developerPing', (req, res) => {
    res.send({ message: 'Developer Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
