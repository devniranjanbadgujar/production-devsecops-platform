const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 8080,
  mongodbUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL,
};

module.exports = env;
