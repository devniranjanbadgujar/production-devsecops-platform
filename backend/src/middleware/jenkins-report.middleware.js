/* global Buffer */
const crypto = require('node:crypto');

function authenticateJenkinsReport(req, res, next) {
  const expected = process.env.JENKINS_REPORT_TOKEN;
  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!expected || !process.env.JENKINS_REPORT_USER_ID) {
    return res.status(503).json({
      status: 'error',
      message: 'Jenkins reporting is not configured',
    });
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  if (
    !supplied ||
    expectedBuffer.length !== suppliedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid Jenkins reporting credentials',
    });
  }

  req.reportingUserId = process.env.JENKINS_REPORT_USER_ID;
  next();
}

module.exports = authenticateJenkinsReport;
