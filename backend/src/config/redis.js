const { createClient } = require("redis");
const env = require("./env");

let redisClient;

const connectRedis = async () => {
  if (!env.redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  redisClient = createClient({
    url: env.redisUrl,
  });

  redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  await redisClient.connect();
  console.log("Redis connected");

  return redisClient;
};

module.exports = { connectRedis };
