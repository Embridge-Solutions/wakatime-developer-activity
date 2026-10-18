const express = require('express');
const router = express.Router();

const routes = [
    { path: '/', file: 'activity' },
];

router.get('/activityPing', (req, res) => {
    res.send({ message: 'Activity Service is Running' });
});

routes.forEach((route) => {
    router.use(route.path, require(`./${route.file}`));
});

module.exports = router;
