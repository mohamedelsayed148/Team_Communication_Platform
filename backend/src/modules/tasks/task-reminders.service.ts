import { Prisma } from "@prisma/client";
import prisma from "../../config/database";
import { createNotification } from "../notifications/notification-creation.service";

const REMINDER_WINDOW_HOURS = 24;

interface ReminderRecipient {
  userId: string;
  type: "DEADLINE_APPROACHING" | "TASK_OVERDUE";
  title: string;
  message: string;
}

export async function processTaskDeadlineReminders() {
  const now = new Date();

  const reminderWindowEnd = new Date(
    now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
  );

  // Find tasks that are overdue or due within the next 24 hours.
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: {
        not: null,
        lte: reminderWindowEnd,
      },
      assignedToId: {
        not: null,
      },
      status: {
        notIn: ["COMPLETED", "CANCELLED"],
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
      assignedToId: true,
      createdById: true,
    },
  });

  let notificationsCreated = 0;
  let duplicatesSkipped = 0;

  for (const task of tasks) {
    if (!task.dueDate || !task.assignedToId) {
      continue;
    }

    const isOverdue = task.dueDate.getTime() <= now.getTime();

    const reminderType = isOverdue ? "TASK_OVERDUE" : "DEADLINE_APPROACHING";

    const recipients: ReminderRecipient[] = [];

    // The assigned member always receives the reminder.
    recipients.push({
      userId: task.assignedToId,
      type: reminderType,
      title: isOverdue ? "Task overdue" : "Upcoming task deadline",
      message: isOverdue
        ? `The task "${task.title}" is overdue. Please review its status.`
        : `The task "${task.title}" is due within the next 24 hours.`,
    });

    // The task creator also receives overdue reminders.
    if (isOverdue && task.createdById !== task.assignedToId) {
      recipients.push({
        userId: task.createdById,
        type: "TASK_OVERDUE",
        title: "A task you created is overdue",
        message: `The task "${task.title}" is overdue. Please follow up with the assigned member.`,
      });
    }

    for (const recipient of recipients) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          const existingReminder = await tx.taskReminderLog.findUnique({
            where: {
              taskId_userId_type_dueDate: {
                taskId: task.id,
                userId: recipient.userId,
                type: recipient.type,
                dueDate: task.dueDate!,
              },
            },
          });

          if (existingReminder) {
            return false;
          }
          // Create the reminder log first.
          // Its unique constraint prevents duplicate reminders.
          await tx.taskReminderLog.create({
            data: {
              taskId: task.id,
              userId: recipient.userId,
              type: recipient.type,
              dueDate: task.dueDate!,
            },
          });
          // Create the in-app notification and email outbox job.

          await createNotification(tx, {
            userId: recipient.userId,
            taskId: task.id,
            type: recipient.type,
            title: recipient.title,
            message: recipient.message,
          });

          return true;
        });
        if (created) {
          notificationsCreated++;
        } else {
          duplicatesSkipped++;
        }
      } catch (error) {
        // Another worker may have already created this reminder.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          duplicatesSkipped++;
          continue;
        }

        throw error;
      }
    }
  }

  return {
    tasksChecked: tasks.length,
    notificationsCreated,
    duplicatesSkipped,
  };
}
