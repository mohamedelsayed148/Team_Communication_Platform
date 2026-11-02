import { Prisma } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  taskId?: string | null;
  type: string;
  title: string;
  message: string;
}

export async function createNotification(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) {
  const { userId, taskId = null, type, title, message } = input;

  // 1. Create the in-app notification.
  const notification = await tx.notification.create({
    data: {
      userId,
      taskId,
      type,
      title,
      message,
    },
  });

  // 2. Retrieve the recipient's email.
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  // 3. Add an email job to the outbox.
  if (user) {
    await tx.emailOutbox.create({
      data: {
        userId,
        toEmail: user.email,
        subject: title,
        body: message,
        status: "PENDING",
      },
    });
  }

  return notification;
}
