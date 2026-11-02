import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";

import { createElement } from "react";

import { createTask } from "@/src/features/tasks/tasks.api";
import type { TaskPriority } from "@/src/features/tasks/tasks.types";

import { getTeams, getTeamById } from "@/src/features/teams/teams.api";
import type { Team, TeamDetails } from "@/src/features/teams/teams.types";

import { useAuth } from "@/src/features/auth/auth.context";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function toLocalDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState<string | undefined>();

  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const manageableTeams = isAdmin
    ? teams
    : teams.filter((team) => team.myRole === "LEADER");

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      try {
        setError("");

        const result = await getTeams();

        if (cancelled) return;

        setTeams(result);

        const availableTeams = isAdmin
          ? result
          : result.filter((team) => team.myRole === "LEADER");

        if (availableTeams.length === 1) {
          setSelectedTeamId(availableTeams[0].id);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Unable to load teams.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTeams(false);
        }
      }
    }

    void loadTeams();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamDetails(null);
      setAssignedToId(undefined);
      setLoadingMembers(false);
      return;
    }

    let cancelled = false;

    async function loadTeamMembers() {
      try {
        setLoadingMembers(true);
        setTeamDetails(null);
        setAssignedToId(undefined);
        setError("");

        const result = await getTeamById(selectedTeamId);

        if (!cancelled) {
          setTeamDetails(result);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || "Unable to load team members.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    }

    void loadTeamMembers();

    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const activeMembers =
    teamDetails?.members.filter((member) => member.user.status === "ACTIVE") ??
    [];

  async function handleCreateTask() {
    if (submitting) return;

    setError("");

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (title.trim().length < 2) {
      setError("Task title must contain at least 2 characters.");
      return;
    }

    if (!selectedTeamId) {
      setError("Please select a team.");
      return;
    }

    if (dueDate && dueDate.getTime() <= Date.now()) {
      setError("Due date must be in the future.");
      return;
    }

    try {
      setSubmitting(true);

      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        teamId: selectedTeamId,
        priority,
        ...(assignedToId ? { assignedToId } : {}),
        ...(dueDate ? { dueDate: dueDate.toISOString() } : {}),
      });

      if (Platform.OS === "web") {
        showMessage("Success", "Task created successfully.");
        router.replace("/");
      } else {
        Alert.alert("Success", "Task created successfully.", [
          {
            text: "OK",
            onPress: () => router.replace("/"),
          },
        ]);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to create task. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(date: Date) {
    return date.toLocaleString();
  }

  function handleWebDateChange(value: string) {
    if (!value) {
      setDueDate(undefined);
      return;
    }

    const selectedDate = new Date(value);

    if (!Number.isNaN(selectedDate.getTime())) {
      setDueDate(selectedDate);
    }
  }

  if (loadingTeams) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.helperText}>Loading teams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.heading}>Create Task</Text>
          <Text style={styles.subtitle}>Add a new task to your team</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error && manageableTeams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="alert-circle-outline"
              size={36}
              color={colors.danger}
            />
            <Text style={styles.error}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => router.replace("/tasks/create")}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : manageableTeams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="people-outline"
              size={36}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No available teams</Text>
            <Text style={styles.helperText}>
              You need to be a team leader or platform admin to create tasks.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Task title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task title"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter task description"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />

            <Text style={styles.label}>Team *</Text>
            {manageableTeams.map((team) => (
              <Pressable
                key={team.id}
                style={[
                  styles.option,
                  selectedTeamId === team.id && styles.selectedOption,
                ]}
                onPress={() => setSelectedTeamId(team.id)}
                disabled={submitting}
              >
                <Text style={styles.optionText}>{team.name}</Text>
                {selectedTeamId === team.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={21}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            ))}

            <Text style={styles.label}>Assign to</Text>

            {!selectedTeamId ? (
              <Text style={styles.helperText}>Select a team first.</Text>
            ) : loadingMembers ? (
              <ActivityIndicator color={colors.primary} />
            ) : teamDetails ? (
              <>
                <Pressable
                  style={[
                    styles.option,
                    !assignedToId && styles.selectedOption,
                  ]}
                  onPress={() => setAssignedToId(undefined)}
                  disabled={submitting}
                >
                  <Text style={styles.optionText}>Unassigned</Text>
                  {!assignedToId && (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color={colors.primary}
                    />
                  )}
                </Pressable>

                {activeMembers.map((member) => (
                  <Pressable
                    key={member.user.id}
                    style={[
                      styles.option,
                      assignedToId === member.user.id && styles.selectedOption,
                    ]}
                    onPress={() => setAssignedToId(member.user.id)}
                    disabled={submitting}
                  >
                    <View>
                      <Text style={styles.optionText}>
                        {member.user.firstName} {member.user.lastName}
                      </Text>
                      <Text style={styles.memberEmail}>
                        {member.user.email}
                      </Text>
                    </View>

                    {assignedToId === member.user.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                ))}

                {activeMembers.length === 0 && (
                  <Text style={styles.helperText}>
                    No active members in this team.
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.helperText}>
                Unable to load team members.
              </Text>
            )}

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {priorityOptions.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.priorityOption,
                    priority === option && styles.selectedPriority,
                  ]}
                  onPress={() => setPriority(option)}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === option && styles.selectedPriorityText,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Due date</Text>

            {Platform.OS === "web" ? (
              <View style={styles.webDateContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />

                {createElement("input", {
                  type: "datetime-local",
                  value: dueDate ? toLocalDateTimeValue(dueDate) : "",
                  min: toLocalDateTimeValue(new Date()),
                  onChange: (event: any) =>
                    handleWebDateChange(event.target.value),
                  disabled: submitting,
                  style: {
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    color: colors.text,
                    fontSize: 14,
                    fontFamily: "inherit",
                    padding: 0,
                  },
                })}
              </View>
            ) : (
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                disabled={submitting}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.dateText}>
                  {dueDate ? formatDate(dueDate) : "Choose due date"}
                </Text>
              </Pressable>
            )}

            {Platform.OS !== "web" && showDatePicker && (
              <DateTimePicker
                value={dueDate ?? new Date(Date.now() + 60 * 60 * 1000)}
                mode="datetime"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);

                  if (event.type === "set" && selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}

            {dueDate && (
              <Pressable onPress={() => setDueDate(undefined)}>
                <Text style={styles.clearDate}>Remove due date</Text>
              </Pressable>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[
                styles.submitButton,
                (submitting || loadingMembers) && styles.disabledButton,
              ]}
              onPress={handleCreateTask}
              disabled={submitting || loadingMembers}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color={colors.white}
                  />
                  <Text style={styles.submitButtonText}>Create Task</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
    justifyContent: "center",
  },
  heading: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.fontSize.md,
  },
  textArea: {
    minHeight: 110,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  memberEmail: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  priorityContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  priorityOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPriority: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priorityText: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  selectedPriorityText: {
    color: colors.white,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
  },
  webDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
  },
  dateText: {
    color: colors.text,
    fontSize: typography.fontSize.md,
  },
  clearDate: {
    color: colors.danger,
    marginTop: spacing.sm,
  },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 9,
    marginTop: spacing.xl,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: "center",
  },
  helperText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});
