const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'security' },
];

router.get('/securityPing', (req, res) => {
    res.send({ message: 'Security Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
