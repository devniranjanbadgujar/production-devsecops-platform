
const express = require('express');
const mongoose = require('mongoose');
const Pipeline = require('../models/pipeline.model');
const authenticateJenkinsReport = require('../middleware/jenkins-report.middleware');

const router = express.Router();

router.post('/', authenticateJenkinsReport, async (req, res, next) => {
  try {
    const {
      projectName,
      branch,
      commitSha = '',
      status,
      durationSeconds,
      logs = '',
      buildNumber,
      buildUrl,
      consoleUrl,
    } = req.body || {};

    const validStatuses = ['success', 'failed', 'aborted'];

    if (
      typeof projectName !== 'string' ||
      !projectName.trim() ||
      typeof branch !== 'string' ||
      !branch.trim() ||
      typeof commitSha !== 'string' ||
      !validStatuses.includes(status) ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      typeof logs !== 'string' ||
      (buildNumber !== undefined && !/^\d+$/.test(String(buildNumber))) ||
      (buildUrl !== undefined && typeof buildUrl !== 'string') ||
      (consoleUrl !== undefined && typeof consoleUrl !== 'string')
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Jenkins pipeline report',
      });
    }

    if (!mongoose.isValidObjectId(req.reportingUserId)) {
      return res.status(503).json({
        status: 'error',
        message: 'Jenkins reporting user is not configured correctly',
      });
    }

    const pipeline = await Pipeline.create({
      projectName: projectName.trim(),
      branch: branch.trim(),
      commitSha: commitSha.slice(0, 40),
      status,
      durationSeconds,
      logs: logs.slice(0, 20000),
      ...(buildNumber !== undefined && {
        buildNumber: String(buildNumber),
      }),
      ...(buildUrl !== undefined && { buildUrl }),
      ...(consoleUrl !== undefined && { consoleUrl }),
      triggeredBy: req.reportingUserId,
    });

    return res.status(201).json({
      status: 'ok',
      data: { id: pipeline._id, status: pipeline.status },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
