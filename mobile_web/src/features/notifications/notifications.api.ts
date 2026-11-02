import apiClient from "@/src/api/client";

import type {
  GetNotificationsFilters,
  NotificationsResponse,
  AppNotification,
  MarkNotificationAsReadResponse,
  MarkAllNotificationsAsReadResponse,
} from "./notifications.types";

/**
 * Get the current user's notifications.
 *
 * Optional filters:
 * - page
 * - limit
 * - isRead
 */
export async function getNotifications(
  filters?: GetNotificationsFilters,
): Promise<NotificationsResponse> {
  const response = await apiClient.get<NotificationsResponse>(
    "/notifications",
    {
      params: filters,
    },
  );

  return response.data;
}

/**
 * Mark one notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<AppNotification | MarkNotificationAsReadResponse["data"]> {
  const response = await apiClient.patch<MarkNotificationAsReadResponse>(
    `/notifications/${notificationId}/read`,
  );

  return response.data.data;
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  const response =
    await apiClient.patch<MarkAllNotificationsAsReadResponse>(
      "/notifications/read-all",
    );

  return response.data.data.updatedCount;
}

/**
 * Get the total number of unread notifications.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await getNotifications({
    page: 1,
    limit: 1,
    isRead: false,
  });

  return response.pagination.total;
}