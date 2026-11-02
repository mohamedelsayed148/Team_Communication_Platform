import { useCallback, useEffect, useRef, useState } from "react";
import { SymbolView } from "expo-symbols";
import { Tabs, useFocusEffect } from "expo-router";
import {
  Text,
  View,
  StyleSheet,
  DeviceEventEmitter,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useAuth } from "@/src/features/auth/auth.context";
import { getNotifications } from "@/src/features/notifications/notifications.api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  const seenNotificationIds = useRef<Set<string> | null>(null);
  const permissionGranted = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    // Never request notifications before authentication is restored.
    if (isLoading || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      // Push/local notification permissions are native-only here.
      let granted = false;

      if (Platform.OS !== "web") {
        const permission = await Notifications.getPermissionsAsync();

        granted = permission.granted;

        if (!granted && !permissionGranted.current) {
          const requested = await Notifications.requestPermissionsAsync();

          granted = requested.granted;
        }

        permissionGranted.current = granted;
      }

      const response = await getNotifications({
        page: 1,
        limit: 50,
        isRead: false,
      });

      const unreadNotifications = response.data;

      setUnreadCount(response.pagination.total);

      const currentIds = new Set(
        unreadNotifications.map((notification) => notification.id),
      );

      // First successful fetch establishes the baseline.
      if (seenNotificationIds.current === null) {
        seenNotificationIds.current = currentIds;
        return;
      }

      const newNotifications = unreadNotifications.filter(
        (notification) => !seenNotificationIds.current!.has(notification.id),
      );

      seenNotificationIds.current = currentIds;

      // Play notification sound on supported native platforms.
      if (Platform.OS !== "web" && granted && newNotifications.length > 0) {
        const latestNotification = newNotifications[0];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: latestNotification.title,
            body: latestNotification.message,
            sound: "default",
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.log("Failed to refresh notification count:", error);
    }
  }, [isAuthenticated, isLoading]);

  // Refresh when the tab navigator receives focus.
  useFocusEffect(
    useCallback(() => {
      if (!isLoading && isAuthenticated) {
        void refreshUnreadCount();
      }
    }, [isAuthenticated, isLoading, refreshUnreadCount]),
  );

  // Poll every 30 seconds, but only while authenticated.
  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshUnreadCount();
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, isLoading, refreshUnreadCount]);

  // Refresh the badge immediately when notifications are marked as read.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "notifications:refresh",
      () => {
        void refreshUnreadCount();
      },
    );

    return () => subscription.remove();
  }, [refreshUnreadCount]);

  // Reset notification tracking when the user logs out.
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      seenNotificationIds.current = null;
      permissionGranted.current = false;
    }
  }, [isAuthenticated]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="teams"
        options={{
          title: "Teams",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "person.3.fill",
                android: "groups",
                web: "groups",
              }}
              tintColor={color}
              size={25}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "pencil",
                android: "edit",
                web: "edit",
              }}
              tintColor={color}
              size={25}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <View style={styles.iconContainer}>
              <SymbolView
                name={{
                  ios: "bell.fill",
                  android: "notifications",
                  web: "notifications",
                }}
                tintColor={color}
                size={25}
              />

              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "person.fill",
                android: "person",
                web: "person",
              }}
              tintColor={color}
              size={25}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: "relative",
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
