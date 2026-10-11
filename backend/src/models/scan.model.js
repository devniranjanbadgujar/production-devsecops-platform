const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema(
  {
    appName: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
    tool: {
      type: String,
      required: true,
      enum: ['Trivy', 'SonarQube', 'OWASP Dependency-Check'],
    },
    status: {
      type: String,
      required: true,
      enum: ['passed', 'failed', 'running'],
    },
    critical: { type: Number, default: 0, min: 0 },
    high: { type: Number, default: 0, min: 0 },
    medium: { type: Number, default: 0, min: 0 },
    low: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scan', scanSchema);