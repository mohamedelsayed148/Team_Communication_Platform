
import cron from "node-cron";
import { processEmailOutbox } from "../modules/notifications/email-outbox.service";

let isProcessing = false;

export function startEmailOutboxScheduler() {
  console.log("Email outbox scheduler started.");

  cron.schedule("* * * * *", async () => {
    if (isProcessing) {
      console.log("Previous email job is still running. Skipping this cycle.");
      return;
    }

    isProcessing = true;

    try {
      console.log("Starting email outbox job...");

      const result = await processEmailOutbox();

      console.log("Email outbox job completed:", result);
    } catch (error) {
      console.error("Email outbox job failed:", error);
    } finally {
      isProcessing = false;
    }
  });
}
