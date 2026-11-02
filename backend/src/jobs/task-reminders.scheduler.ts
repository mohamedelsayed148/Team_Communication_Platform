import cron from "node-cron";
import { processTaskDeadlineReminders } from "../modules/tasks/task-reminders.service";

let isProcessing = false;

export function startTaskReminderScheduler() {
  console.log("Task reminder scheduler started.");

  cron.schedule("*/15 * * * *", async () => {
    if (isProcessing) {
      console.log(
        "Previous reminder job is still running. Skipping this cycle.",
      );
      return;
    }

    isProcessing = true;

    try {
      console.log("Starting task deadline reminder job...");

      const result = await processTaskDeadlineReminders();

      console.log("Task deadline reminder job completed:", result);
    } catch (error) {
      console.error("Task deadline reminder job failed:", error);
    } finally {
      isProcessing = false;
    }
  });
}
