import app from "./app";
import prisma from "./config/database";
import { env } from "./config/env";
import { startTaskReminderScheduler } from "./jobs/task-reminders.scheduler";
import { startEmailOutboxScheduler } from "./jobs/email-outbox.scheduler";

const server = app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);

  startTaskReminderScheduler();
  startEmailOutboxScheduler();
});

async function shutdown() {
  console.log("Shutting down server...");

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
