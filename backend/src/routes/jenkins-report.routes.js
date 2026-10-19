
const express = require('express');
const mongoose = require('mongoose');
const Pipeline = require('../models/pipeline.model');
const Scan = require('../models/scan.model');
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
      scanReports = [],
    } = req.body || {};

    const validStatuses = ['success', 'failed', 'aborted'];

    if (
      typeof projectName !== 'string' ||
      !projectName.trim() ||
      projectName.trim().length > 100 ||
      typeof branch !== 'string' ||
      !branch.trim() ||
      branch.trim().length > 200 ||
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

    // Early pipeline failures may happen before Trivy runs.
    // Once scan reports are present, require one Backend and one Frontend.
    if (
      !Array.isArray(scanReports) ||
      (scanReports.length !== 0 && scanReports.length !== 2)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide either zero or exactly two Trivy scan reports',
      });
    }

    const validApps = new Set(['Backend', 'Frontend']);
    const seenApps = new Set();

    for (const report of scanReports) {
      if (
        !report ||
        !validApps.has(report.appName) ||
        seenApps.has(report.appName) ||
        report.tool !== 'Trivy' ||
        !['passed', 'failed'].includes(report.status) ||
        !['critical', 'high', 'medium', 'low'].every(
          (severity) =>
            Number.isInteger(report[severity]) && report[severity] >= 0
        )
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid or duplicate Trivy scan report',
        });
      }

      seenApps.add(report.appName);
    }

    if (
      scanReports.length === 2 &&
      (!seenApps.has('Backend') || !seenApps.has('Frontend'))
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Both Backend and Frontend Trivy reports are required',
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

    if (scanReports.length === 2) {
      await Scan.insertMany(
        scanReports.map((report) => ({
          appName: report.appName,
          branch: branch.trim(),
          tool: 'Trivy',
          status: report.status,
          critical: report.critical,
          high: report.high,
          medium: report.medium,
          low: report.low,
        }))
      );
    }

    return res.status(201).json({
      status: 'okay',
      data: {
        id: pipeline._id,
        status: pipeline.status,
        scansSaved: scanReports.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
