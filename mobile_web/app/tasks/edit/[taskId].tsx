import { createElement, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/src/features/auth/auth.context";
import { getTaskById, updateTask } from "@/src/features/tasks/tasks.api";
import type {
  TaskPriority,
  TaskDetails,
} from "@/src/features/tasks/tasks.types";
import { getTeams, getTeamById } from "@/src/features/teams/teams.api";
import type { TeamDetails } from "@/src/features/teams/teams.types";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function toLocalDateTimeValue(date: Date | null): string {
  if (!date) return "";

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditTaskScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [team, setTeam] = useState<TeamDetails | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadError, setLoadError] = useState("");

  const activeMembers =
    team?.members.filter((member) => member.user.status === "ACTIVE") ?? [];

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (taskId) {
      router.replace({
        pathname: "/tasks/[taskId]",
        params: { taskId },
      });
    } else {
      router.replace("/(tabs)");
    }
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadData = useCallback(async () => {
    if (!taskId) {
      setLoadError("Task ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");
      setPermissionDenied(false);

      const taskData = await getTaskById(taskId);
      setTask(taskData);

      setTitle(taskData.title);
      setDescription(taskData.description ?? "");
      setPriority(taskData.priority);
      setAssignedToId(taskData.assignedToId ?? "");
      setDueDate(taskData.dueDate ? new Date(taskData.dueDate) : null);

      const teams = await getTeams();
      const currentTeam = teams.find((item) => item.id === taskData.teamId);

      if (!isAdmin && currentTeam?.myRole !== "LEADER") {
        setPermissionDenied(true);
        return;
      }

      try {
        const teamData = await getTeamById(taskData.teamId);
        setTeam(teamData);
      } catch {
        // An admin who is not a team member may not be able to
        // retrieve the team's member list.
        setTeam(null);
      }
    } catch (error: any) {
      setLoadError(
        error?.response?.data?.message ?? "Unable to load task details.",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId, isAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSave() {
    if (!task) return;

    if (title.trim().length < 2) {
      showMessage("Validation", "Task title must be at least 2 characters.");
      return;
    }

    if (dueDate && dueDate.getTime() <= Date.now()) {
      showMessage("Validation", "Deadline must be in the future.");
      return;
    }

    if (
      assignedToId &&
      activeMembers.length > 0 &&
      !activeMembers.some((member) => member.user.id === assignedToId)
    ) {
      showMessage("Validation", "Please select an active team member.");
      return;
    }

    try {
      setSaving(true);

      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        assignedToId: assignedToId || null,
      });

      const openTaskDetails = () => {
        router.replace({
          pathname: "/tasks/[taskId]",
          params: { taskId: task.id },
        });
      };

      if (Platform.OS === "web") {
        window.alert("Task updated successfully.");
        openTaskDetails();
      } else {
        Alert.alert("Success", "Task updated successfully.", [
          {
            text: "OK",
            onPress: openTaskDetails,
          },
        ]);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Unable to update task.";
      showMessage("Error", message);
    } finally {
      setSaving(false);
    }
  }

  const handleWebDateChange = (event: any) => {
    const value = event.target.value;

    if (!value) {
      setDueDate(null);
      return;
    }

    const selectedDate = new Date(value);

    if (!Number.isNaN(selectedDate.getTime())) {
      setDueDate(selectedDate);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{loadError}</Text>

        <AppButton title="Try Again" onPress={loadData} />
        <View style={styles.buttonSpacing} />
        <AppButton title="Go Back" variant="outline" onPress={goBack} />
      </SafeAreaView>
    );
  }

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>
          You do not have permission to edit this task.
        </Text>
        <AppButton title="Go Back" onPress={goBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Task Information</Text>

          <AppInput
            label="Task Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
          />

          <AppInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter task description"
            multiline
          />

          <Text style={styles.label}>Team</Text>
          <Text style={styles.readOnlyValue}>
            {task?.team.name ?? "Current team"}
          </Text>

          <Text style={styles.label}>Priority</Text>
          <View style={styles.optionsContainer}>
            {priorities.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.option,
                  priority === item && styles.selectedOption,
                ]}
                onPress={() => setPriority(item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    priority === item && styles.selectedOptionText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Assignee</Text>
          <View style={styles.optionsContainer}>
            <Pressable
              style={[
                styles.option,
                assignedToId === "" && styles.selectedOption,
              ]}
              onPress={() => setAssignedToId("")}
            >
              <Text
                style={[
                  styles.optionText,
                  assignedToId === "" && styles.selectedOptionText,
                ]}
              >
                Unassigned
              </Text>
            </Pressable>

            {activeMembers.map((member) => (
              <Pressable
                key={member.user.id}
                style={[
                  styles.option,
                  assignedToId === member.user.id && styles.selectedOption,
                ]}
                onPress={() => setAssignedToId(member.user.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    assignedToId === member.user.id &&
                      styles.selectedOptionText,
                  ]}
                >
                  {member.user.firstName} {member.user.lastName}
                </Text>
              </Pressable>
            ))}

            {!team && task?.assignedTo && (
              <Pressable
                style={[
                  styles.option,
                  assignedToId === task.assignedTo.id && styles.selectedOption,
                ]}
                onPress={() => setAssignedToId(task.assignedTo!.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    assignedToId === task.assignedTo.id &&
                      styles.selectedOptionText,
                  ]}
                >
                  {task.assignedTo.firstName} {task.assignedTo.lastName}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.label}>Deadline</Text>

          {Platform.OS === "web" ? (
            <View style={styles.webDateContainer}>
              <Text style={styles.webDateLabel}>Choose date and time</Text>
              {createElement("input", {
                type: "datetime-local",
                value: toLocalDateTimeValue(dueDate),
                min: toLocalDateTimeValue(new Date()),
                onChange: handleWebDateChange,
                style: {
                  width: "100%",
                  minHeight: 44,
                  padding: "10px 12px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: 16,
                  boxSizing: "border-box",
                },
              })}
            </View>
          ) : (
            <>
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.dateText}>
                  {dueDate ? dueDate.toLocaleString() : "No deadline"}
                </Text>
              </Pressable>

              <View style={styles.dateActions}>
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateActionText}>Choose date</Text>
                </Pressable>
                <Pressable onPress={() => setDueDate(null)}>
                  <Text style={styles.clearDateText}>Remove deadline</Text>
                </Pressable>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate ?? new Date(Date.now() + 60 * 60 * 1000)}
                  mode="datetime"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type === "set" && selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                />
              )}
            </>
          )}

          {Platform.OS === "web" && (
            <Pressable onPress={() => setDueDate(null)}>
              <Text style={styles.clearDateText}>Remove deadline</Text>
            </Pressable>
          )}

          {dueDate && (
            <Text style={styles.selectedDateText}>
              Selected deadline: {dueDate.toLocaleString()}
            </Text>
          )}
        </View>

        <AppButton
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />

        <AppButton
          title="Cancel"
          variant="outline"
          onPress={goBack}
          disabled={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  readOnlyValue: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    paddingVertical: spacing.sm,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
  },
  selectedOptionText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  dateText: {
    color: colors.text,
    fontSize: typography.fontSize.md,
  },
  dateActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  dateActionText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  clearDateText: {
    color: colors.danger,
    fontWeight: typography.fontWeight.semibold,
    paddingVertical: spacing.sm,
  },
  webDateContainer: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  webDateLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  selectedDateText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.md,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  buttonSpacing: {
    height: spacing.sm,
  },
});
