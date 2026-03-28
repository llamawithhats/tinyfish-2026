import { getEnv } from "@autointern/config";
import { queueNames } from "@autointern/domain";
import { Worker } from "bullmq";
import { prisma } from "./prisma";
import { discoverJobsForSource } from "./jobs/discover-jobs";
import { generateApplicationPacket } from "./jobs/generate-packet";
import { submitApplication } from "./jobs/submit-application";
import { discoverJobsQueue, redisConnection } from "./queues";

getEnv();

const discoveryWorker = new Worker(
  queueNames.discoverJobs,
  async (job) => {
    await discoverJobsForSource(job.data.jobSourceId);
  },
  { connection: redisConnection, concurrency: 2 }
);

const packetWorker = new Worker(
  queueNames.generatePacket,
  async (job) => {
    await generateApplicationPacket(job.data.jobListingId);
  },
  { connection: redisConnection, concurrency: 2 }
);

const submitWorker = new Worker(
  queueNames.submitApplication,
  async (job) => {
    await submitApplication(job.data.applicationPacketId);
  },
  { connection: redisConnection, concurrency: 1 }
);

const workers = [discoveryWorker, packetWorker, submitWorker];

async function scheduleDueSources() {
  const dueSources = await prisma.jobSource.findMany({
    where: {
      enabled: true,
      OR: [{ nextScanAt: null }, { nextScanAt: { lte: new Date() } }]
    },
    take: 25
  });

  await Promise.all(
    dueSources.map((source) =>
      discoverJobsQueue.add(
        "discover-job-source",
        { jobSourceId: source.id },
        {
          jobId: `discover:${source.id}:${Math.floor(Date.now() / (15 * 60 * 1000))}`,
          removeOnComplete: 100
        }
      )
    )
  );
}

scheduleDueSources().catch((error) => {
  console.error("Failed to schedule initial discovery jobs", error);
});

setInterval(() => {
  scheduleDueSources().catch((error) => {
    console.error("Failed to schedule discovery jobs", error);
  });
}, 60_000);

for (const worker of workers) {
  worker.on("failed", (job, error) => {
    console.error(`Worker ${worker.name} failed job ${job?.id}`, error);
  });
}

console.log("AutoIntern worker is running.");
