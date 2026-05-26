import { runFeedFanoutJob } from "./jobs/feedFanout.js";
import { runMediaProcessJob } from "./jobs/mediaProcess.js";
import { runNotificationDigestJob } from "./jobs/notificationDigest.js";

const jobs = [runFeedFanoutJob, runMediaProcessJob, runNotificationDigestJob];

async function main() {
  console.log("35mm worker booted");

  for (const job of jobs) {
    await job();
  }

  console.log("35mm worker finished one pass");
}

void main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
