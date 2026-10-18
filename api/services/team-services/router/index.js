const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'team' },
];

router.get('/teamPing', (req, res) => {
    res.send({ message: 'Team Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
