const app = require("./app");
const env = require("./config/env");
const connectDatabase = require("./config/database");
const { connectRedis } = require("./config/redis");

const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();

    app.listen(env.port, () => {
      console.log("Backend server running on port " + env.port);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

startServer();
