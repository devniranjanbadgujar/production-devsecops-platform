
const mongoose = require('mongoose');

const pipelineSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    branch: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    commitSha: {
      type: String,
      default: '',
      trim: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed', 'aborted'],
      default: 'pending',
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    logs: {
      type: String,
      default: '',
      maxlength: 20000,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pipeline', pipelineSchema);
