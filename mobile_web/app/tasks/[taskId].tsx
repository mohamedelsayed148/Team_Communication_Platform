import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  createTaskUpdate,
  getTaskById,
  updateTaskStatus,
  deleteTask,
} from "@/src/features/tasks/tasks.api";

import type {
  TaskDetails,
  TaskPriority,
  TaskStatus,
} from "@/src/features/tasks/tasks.types";

import { getTeams } from "@/src/features/teams/teams.api";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { useAuth } from "@/src/features/auth/auth.context";

const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const allStatuses: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
  "CANCELLED",
];

const memberStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW"];

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

function formatDate(date: string | null): string {
  if (!date) return "No deadline";

  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

export default function TaskDetailsScreen() {
  const [updateContent, setUpdateContent] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { user } = useAuth();

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.roles?.includes("ADMIN") ?? false;
  const isAssignedMember = task?.assignedToId === user?.id;
  const canManageStatus = isAdmin || isTeamLeader;

  const isTaskClosed =
    task?.status === "COMPLETED" || task?.status === "CANCELLED";

  const canChangeStatus =
    canManageStatus || (isAssignedMember && !isTaskClosed);

  const availableStatuses = canManageStatus
    ? allStatuses
    : isAssignedMember && !isTaskClosed
      ? memberStatuses
      : [];

  const goToTasks = () => {
    router.replace("/(tabs)");
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      goToTasks();
    }
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setError("Task ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getTaskById(taskId);
      setTask(result);

      if (!isAdmin && user?.id) {
        try {
          const teams = await getTeams();
          const currentTeam = teams.find((team) => team.id === result.teamId);

          setIsTeamLeader(currentTeam?.myRole === "LEADER");
        } catch (teamError) {
          console.error("Failed to load team permissions:", teamError);
          setIsTeamLeader(false);
        }
      } else {
        setIsTeamLeader(false);
      }
    } catch (err: any) {
      console.error("Failed to load task details:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load task details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId, isAdmin, user?.id]);

  const handleSubmitUpdate = async () => {
    const content = updateContent.trim();

    if (!content) {
      showMessage("Validation", "Please enter a progress update.");
      return;
    }

    try {
      setSubmittingUpdate(true);

      await createTaskUpdate(taskId, { content });

      setUpdateContent("");
      await loadTask();

      showMessage("Success", "Progress update submitted successfully.");
    } catch (err: any) {
      showMessage(
        "Error",
        err?.response?.data?.message ||
          "Unable to submit progress update. Please try again.",
      );
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleChangeStatus = async (newStatus: TaskStatus) => {
    if (!task || newStatus === task.status || updatingStatus) {
      return;
    }

    if (!canManageStatus) {
      if (!isAssignedMember) {
        showMessage(
          "Permission denied",
          "Only the assigned member or a team leader can change this task.",
        );
        return;
      }

      if (
        newStatus === "COMPLETED" ||
        newStatus === "CANCELLED" ||
        isTaskClosed
      ) {
        showMessage(
          "Permission denied",
          "Only team leaders or platform administrators can complete or cancel tasks.",
        );
        return;
      }
    }

    const previousTask = task;

    try {
      setUpdatingStatus(true);

      // Update the visible status immediately.
      setTask({
        ...task,
        status: newStatus,
      });

      await updateTaskStatus(task.id, {
        status: newStatus,
      });

      await loadTask();

      showMessage(
        "Success",
        `Task status changed to ${statusLabels[newStatus]}.`,
      );
    } catch (err: any) {
      // Restore the previous status if the API request fails.
      setTask(previousTask);

      showMessage(
        "Error",
        err?.response?.data?.message ||
          "Unable to update task status. Please try again.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const performDeleteTask = async () => {
    if (!task || !isAdmin || deletingTask) return;

    try {
      setDeletingTask(true);

      await deleteTask(task.id);

      goToTasks();
    } catch (err: any) {
      showMessage(
        "Error",
        err?.response?.data?.message || "Unable to delete task.",
      );
    } finally {
      setDeletingTask(false);
    }
  };

  const handleDeleteTask = () => {
    if (!task || !isAdmin || deletingTask) return;

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to permanently delete this task? This action cannot be undone.",
      );

      if (confirmed) {
        void performDeleteTask();
      }

      return;
    }

    Alert.alert(
      "Delete Task",
      "Are you sure you want to permanently delete this task? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void performDeleteTask(),
        },
      ],
    );
  };

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>Task Details</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      ) : error || !task ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />

          <Text style={styles.errorText}>{error || "Task not found."}</Text>

          <Pressable style={styles.retryButton} onPress={loadTask}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>

          <Pressable onPress={handleBack}>
            <Text style={styles.backText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.card}>
              <Text style={styles.taskTitle}>{task.title}</Text>

              {canManageStatus && (
                <Pressable
                  style={styles.editTaskButton}
                  onPress={() =>
                    router.push({
                      pathname: "/tasks/edit/[taskId]",
                      params: { taskId: task.id },
                    })
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color={colors.white}
                  />
                  <Text style={styles.editTaskButtonText}>Edit Task</Text>
                </Pressable>
              )}

              <View style={styles.badgesContainer}>
                <View style={styles.statusBadge}>
                  <Text style={styles.badgeText}>
                    {statusLabels[task.status]}
                  </Text>
                </View>

                <View style={styles.priorityBadge}>
                  <Text style={styles.badgeText}>
                    {priorityLabels[task.priority]}
                  </Text>
                </View>
              </View>

              {canChangeStatus && (
                <View style={styles.statusSelectorContainer}>
                  <Text style={styles.sectionTitle}>Change Status</Text>

                  {updatingStatus ? (
                    <View style={styles.statusLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.secondaryText}>
                        Updating status...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statusOptions}>
                      {availableStatuses.map((status) => {
                        const isSelected = task.status === status;

                        return (
                          <Pressable
                            key={status}
                            style={[
                              styles.statusOption,
                              isSelected && styles.selectedStatusOption,
                            ]}
                            onPress={() => handleChangeStatus(status)}
                            disabled={isSelected || updatingStatus}
                          >
                            <Text
                              style={[
                                styles.statusOptionText,
                                isSelected && styles.selectedStatusOptionText,
                              ]}
                            >
                              {statusLabels[status]}
                            </Text>

                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={17}
                                color={colors.primary}
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.sectionTitle}>Description</Text>

              <Text style={styles.description}>
                {task.description || "No description provided."}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Team</Text>
              <Text style={styles.primaryText}>{task.team.name}</Text>
              <Text style={styles.secondaryText}>
                {task.team.description || "No team description."}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Assignment</Text>

              <Text style={styles.fieldLabel}>Created by</Text>
              <Text style={styles.primaryText}>
                {getFullName(task.createdBy)}
              </Text>
              <Text style={styles.secondaryText}>{task.createdBy.email}</Text>

              <View style={styles.sectionDivider} />

              <Text style={styles.fieldLabel}>Assigned to</Text>

              {task.assignedTo ? (
                <>
                  <Text style={styles.primaryText}>
                    {getFullName(task.assignedTo)}
                  </Text>
                  <Text style={styles.secondaryText}>
                    {task.assignedTo.email}
                  </Text>
                </>
              ) : (
                <Text style={styles.secondaryText}>
                  This task is not assigned yet.
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Deadline</Text>

              <View style={styles.deadlineRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={task.isOverdue ? colors.danger : colors.primary}
                />
                <Text style={styles.primaryText}>
                  {formatDate(task.dueDate)}
                </Text>
              </View>

              {task.isOverdue && (
                <Text style={styles.overdueText}>This task is overdue.</Text>
              )}
            </View>

            <View style={styles.card}>
              {isAssignedMember && (
                <>
                  <View style={styles.submitUpdateContainer}>
                    <Text style={styles.sectionTitle}>
                      Add a progress update
                    </Text>

                    <TextInput
                      style={styles.updateInput}
                      value={updateContent}
                      onChangeText={setUpdateContent}
                      placeholder="Describe your progress..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      textAlignVertical="top"
                      editable={!submittingUpdate}
                    />

                    <Pressable
                      style={[
                        styles.submitButton,
                        submittingUpdate && styles.disabledButton,
                      ]}
                      onPress={handleSubmitUpdate}
                      disabled={submittingUpdate}
                    >
                      {submittingUpdate ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.submitButtonText}>
                          Submit Update
                        </Text>
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.sectionDivider} />
                </>
              )}

              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Progress History</Text>
                <Text style={styles.updateCount}>
                  {task.updates.length} updates
                </Text>
              </View>

              {task.updates.length === 0 ? (
                <Text style={styles.emptyText}>
                  No progress updates have been submitted yet.
                </Text>
              ) : (
                task.updates.map((update, index) => (
                  <View key={update.id} style={styles.updateItem}>
                    <View style={styles.timeline}>
                      <View style={styles.timelineDot} />

                      {index !== task.updates.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>

                    <View style={styles.updateContent}>
                      <Text style={styles.updateAuthor}>
                        {getFullName(update.author)}
                      </Text>
                      <Text style={styles.updateDate}>
                        {formatDate(update.createdAt)}
                      </Text>
                      <Text style={styles.updateText}>{update.content}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {isAdmin && (
              <Pressable
                style={[
                  styles.deleteTaskButton,
                  deletingTask && styles.disabledButton,
                ]}
                onPress={handleDeleteTask}
                disabled={deletingTask}
              >
                {deletingTask ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={colors.white}
                    />
                    <Text style={styles.deleteTaskButtonText}>Delete Task</Text>
                  </>
                )}
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  errorText: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    color: colors.danger,
    fontSize: typography.fontSize.md,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  backText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  editTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 9,
    marginBottom: spacing.md,
  },
  editTaskButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.danger,
    padding: spacing.md,
    borderRadius: 9,
    marginBottom: spacing.md,
  },
  deleteTaskButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  badgesContainer: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  priorityBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  badgeText: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  statusSelectorContainer: {
    marginBottom: spacing.lg,
  },
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  selectedStatusOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  statusOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  selectedStatusOptionText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  statusLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  primaryText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  secondaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  overdueText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.sm,
  },
  submitUpdateContainer: {
    marginBottom: spacing.md,
  },
  updateInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  updateCount: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  updateItem: {
    flexDirection: "row",
    minHeight: 90,
  },
  timeline: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  updateContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  updateAuthor: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  updateDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  updateText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
});
