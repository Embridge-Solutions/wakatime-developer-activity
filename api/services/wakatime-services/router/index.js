const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'wakatime' },
];

router.get('/wakatimePing', (req, res) => {
    res.send({ message: 'WakaTime Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
