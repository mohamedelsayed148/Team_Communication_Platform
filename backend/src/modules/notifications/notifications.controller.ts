import { Request, Response, NextFunction } from "express";

import { getNotificationsQuerySchema } from "./notifications.validation";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notifications.service";

export async function getNotificationsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Validate query parameters.
    const validation = getNotificationsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid notification filters",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // 2. Get the authenticated user's ID.
    const userId = req.user!.id;

    // 3. Retrieve only this user's notifications.
    const result = await getNotifications(userId, validation.data);

    // 4. Return the result.
    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsReadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const notificationId = req.params.notificationId;

    if (
      typeof notificationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        notificationId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
      return;
    }

    const result = await markNotificationAsRead(req.user!.id, notificationId);

    res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsAsReadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await markAllNotificationsAsRead(req.user!.id);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
