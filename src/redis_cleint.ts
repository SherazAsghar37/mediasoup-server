import Redis from "ioredis";

const redisPublisher = new Redis();
const redisSubscriber = new Redis();

redisPublisher.on("connect", () => {
  console.log("Connected to Redis Publisher");
});

redisSubscriber.on("connect", () => {
  console.log("Connected to Redis Subscriber");
});

redisPublisher.on("error", (err) => {
  console.error("Redis Publisher error:", err);
});

redisSubscriber.on("error", (err) => {
  console.error("Redis Subscriber error:", err);
});

export { redisPublisher, redisSubscriber };