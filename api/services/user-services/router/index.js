const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'user' },
];

router.get('/userPing', (req, res) => {
    res.send({ message: 'User Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
