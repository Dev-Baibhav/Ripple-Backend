import redis from "redis";
import { configDotenv } from "dotenv";
configDotenv();

const client = redis.createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: "snappy-gemlike-toothpaste-32707.db.redis.io",
    port: 19316
  }
});

// Handles Redis client errors
client.on("error", (err) => {
  console.error("Redis Error:", err.message);
});

// Handles successful connection
client.on("connect", () => {
  console.log("Connecting to Redis...");
});

// Handles ready state
client.on("ready", () => {
  console.log("Redis is Ready");
});

// Handles disconnect
client.on("end", () => {
  console.log("Redis Connection Closed");
});

async function connectRedis() {
  try {
    await client.connect();

    console.log("Redis Connected Successfully");
  } catch (error) {
    console.error("Connection Failed:", error.message);
  }
}

const ConnectRedis = {
  connectRedis,
  client
}

export default ConnectRedis