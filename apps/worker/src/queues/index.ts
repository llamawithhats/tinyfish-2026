import { getEnv } from "@autointern/config";
import { queueNames } from "@autointern/domain";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const env = getEnv();

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const discoverJobsQueue = new Queue(queueNames.discoverJobs, {
  connection: redisConnection
});

export const generatePacketQueue = new Queue(queueNames.generatePacket, {
  connection: redisConnection
});

export const submitApplicationQueue = new Queue(queueNames.submitApplication, {
  connection: redisConnection
});
