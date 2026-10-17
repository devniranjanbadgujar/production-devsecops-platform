const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');
const notFound = require('./middleware/not-found.middleware');
const errorHandler = require('./middleware/error.middleware');
const scansRoutes = require('./routes/scans.routes');
const authroutes = require('./routes/auth.routes');
const pipelinesRoutes = require('./routes/pipelines.routes');
const jenkinsReportRoutes = require('./routes/jenkins-report.routes');
const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api', healthRoutes);
app.use('/api', authroutes);
app.use('/api', scansRoutes);
app.use('/api/pipelines', pipelinesRoutes);
app.use('/api/integrations/jenkins/pipelines', jenkinsReportRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;