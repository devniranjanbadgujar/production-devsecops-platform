const express = require('express');
const Scan = require('../models/scan.model');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/scans', authenticate, async (req, res, next) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 }).limit(100);

    res.json({
      status: 'ok',
      data: scans,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/scans', authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.create(req.body);

    res.status(201).json({
      status: 'ok',
      data: scan,
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      error.status = 400;
    }
    next(error);
  }
});

module.exports = router;