
const express = require('express');
const Pipeline = require('../models/pipeline.model');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Get the current user's pipeline history
router.get('/', async (req, res, next) => {
  try {
    const pipelines = await Pipeline.find({
      triggeredBy: req.user.sub,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ status: 'ok', data: pipelines });
  } catch (error) {
    next(error);
  }
});

// Record a pipeline run
router.post('/', async (req, res, next) => {
  try {
    const {
      projectName,
      branch,
      commitSha = '',
      status = 'pending',
      durationSeconds = 0,
      logs = '',
    } = req.body || {};

    const validStatuses = [
      'pending',
      'running',
      'success',
      'failed',
      'aborted',
    ];

    if (
      typeof projectName !== 'string' ||
      !projectName.trim() ||
      typeof branch !== 'string' ||
      !branch.trim() ||
      typeof commitSha !== 'string' ||
      !validStatuses.includes(status) ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      typeof logs !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid pipeline run data',
      });
    }

    const pipeline = await Pipeline.create({
      projectName: projectName.trim(),
      branch: branch.trim(),
      commitSha,
      status,
      durationSeconds,
      logs,
      triggeredBy: req.user.sub,
    });

    return res.status(201).json({
      status: 'ok',
      data: pipeline,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
