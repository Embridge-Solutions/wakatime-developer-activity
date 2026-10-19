const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'mail' },
];

router.get('/mailPing', (req, res) => {
    res.send({ message: 'Mail Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
