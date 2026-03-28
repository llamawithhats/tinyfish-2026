import { getEnv } from "@autointern/config";
import { queueNames } from "@autointern/domain";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const env = getEnv();
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const discoverJobsQueue = new Queue(queueNames.discoverJobs, { connection });
export const generatePacketQueue = new Queue(queueNames.generatePacket, { connection });
export const submitApplicationQueue = new Queue(queueNames.submitApplication, { connection });
