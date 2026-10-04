import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config({ path: "./.env" });

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error);
});

export const connectRedis = async () => {

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  console.log("Redis Connected");
};

export default redisClient;