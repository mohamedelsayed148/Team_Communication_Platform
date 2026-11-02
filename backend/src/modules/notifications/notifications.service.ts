import prisma from "../../config/database";
import type { GetNotificationsQuery } from "./notifications.validation";

export async function getNotifications(
  userId: string,
  filters: GetNotificationsQuery,
) {
  const { page, limit, isRead } = filters;

  const where = {
    userId,

    ...(isRead !== undefined && {
      isRead: isRead === "true",
    }),
  };

  const skip = (page - 1) * limit;

  // Retrieve notifications and total count concurrently.
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        userId: true,
        taskId: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        readAt: true,
        createdAt: true,

        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    }),

    prisma.notification.count({
      where,
    }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      userId: true,
      isRead: true,
      readAt: true,
    },
  });

  if (!notification) {
    throw Object.assign(new Error("Notification not found"), {
      statusCode: 404,
    });
  }

  if (notification.userId !== userId) {
    throw Object.assign(
      new Error("You are not allowed to access this notification"),
      {
        statusCode: 403,
      },
    );
  }

  // Preserve the original readAt timestamp if already read.
  if (notification.isRead) {
    return {
      id: notification.id,
      isRead: notification.isRead,
      readAt: notification.readAt,
    };
  }

  const updatedNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
    select: {
      id: true,
      isRead: true,
      readAt: true,
    },
  });

  return updatedNotification;
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
}
