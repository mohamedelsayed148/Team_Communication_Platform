import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/src/features/notifications/notifications.api";

import type { AppNotification } from "@/src/features/notifications/notifications.types";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");

  const showMessage = (message: string) => {
    if (Platform.OS === "web") {
      window.alert(message);
    }
  };

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await getNotifications({
        page: 1,
        limit: 50,
      });

      setNotifications(response.data);
    } catch {
      setError("Could not load notifications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    void fetchNotifications(true);
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (markingNotificationId || markingAll) return;

    if (!notification.isRead) {
      try {
        setMarkingNotificationId(notification.id);

        await markNotificationAsRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : item,
          ),
        );

        DeviceEventEmitter.emit("notifications:refresh");
      } catch {
        setError("Could not mark notification as read.");
        return;
      } finally {
        setMarkingNotificationId(null);
      }
    }

    if (notification.taskId) {
      router.push(`/tasks/${notification.taskId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    const hasUnread = notifications.some(
      (notification) => !notification.isRead,
    );

    if (!hasUnread || markingAll || markingNotificationId) return;

    try {
      setMarkingAll(true);
      setError("");

      await markAllNotificationsAsRead();

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? readAt,
        })),
      );

      DeviceEventEmitter.emit("notifications:refresh");
    } catch {
      setError("Could not mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const isMarking = markingNotificationId === item.id;

    return (
      <Pressable
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard,
          isMarking && styles.processingCard,
        ]}
        onPress={() => void handleNotificationPress(item)}
        disabled={Boolean(markingNotificationId) || markingAll}
      >
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>

          {isMarking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            !item.isRead && <View style={styles.unreadDot} />
          )}
        </View>

        <Text style={styles.message}>{item.message}</Text>

        {item.task && (
          <Text style={styles.taskTitle}>Task: {item.task.title}</Text>
        )}

        {item.taskId && (
          <Text style={styles.openTaskText}>Tap to view task</Text>
        )}

        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.error}>{error}</Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchNotifications()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount} unread</Text>
        </View>

        <Pressable
          onPress={() => void handleMarkAllAsRead()}
          disabled={
            unreadCount === 0 || markingAll || Boolean(markingNotificationId)
          }
          style={({ pressed }) => [
            styles.markAllButton,
            pressed && styles.pressed,
          ]}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.markAllText,
                unreadCount === 0 && styles.disabledText,
              ]}
            >
              Mark all as read
            </Text>
          )}
        </Pressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptyText}>
              You don't have any notifications yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  markAllButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  markAllText: {
    color: colors.primary,
    fontWeight: "600",
  },
  disabledText: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  processingCard: {
    opacity: 0.65,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  taskTitle: {
    color: colors.primary,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  openTaskText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: "600",
  },
});
