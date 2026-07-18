const express = require('express');
const router = express.Router();

const externalApiKey = require('../middleware/externalApiKey');
const { verifyCoHost } = require('../controllers/externalVerifyController');

// GET /api/v1/external/events/:eventSlug/verify-cohost?email=someone@example.com
// Header: x-api-key: <EXTERNAL_API_KEY>
router.get('/events/:eventSlug/verify-cohost', externalApiKey, verifyCoHost);

module.exports = router;
