import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getTasks } from "@/src/features/tasks/tasks.api";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  GetTasksFilters,
} from "@/src/features/tasks/tasks.types";

import { getTeams } from "@/src/features/teams/teams.api";
import type { Team } from "@/src/features/teams/teams.types";

import { useAuth } from "@/src/features/auth/auth.context";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

import { useRouter } from "expo-router";

type FilterType = "status" | "priority" | "team" | null;

const statusOptions: { label: string; value: TaskStatus | undefined }[] = [
  { label: "All statuses", value: undefined },
  { label: "To do", value: "TODO" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "In review", value: "IN_REVIEW" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const priorityOptions: { label: string; value: TaskPriority | undefined }[] = [
  { label: "All priorities", value: undefined },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

export default function TasksScreen() {
  const { user } = useAuth();

  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const canCreateTask =
    user?.roles.includes("ADMIN") ||
    teams.some((team) => team.myRole === "LEADER");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [teamsError, setTeamsError] = useState("");

  // Selected filter values
  const [status, setStatus] = useState<TaskStatus | undefined>();
  const [priority, setPriority] = useState<TaskPriority | undefined>();
  const [teamId, setTeamId] = useState<string | undefined>();
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Filters currently applied to the API request
  const [appliedFilters, setAppliedFilters] = useState<GetTasksFilters>({});

  // Controls which filter modal is visible
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);

  // Controls whether the filter box is expanded
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      setError("");

      const result = await getTasks(appliedFilters);
      setTasks(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to retrieve tasks. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedFilters]);

  // Load tasks whenever applied filters change
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load the user's teams for the Team filter
  useEffect(() => {
    async function loadTeams() {
      try {
        setTeamsError("");
        const result = await getTeams();
        setTeams(result);
      } catch {
        setTeamsError("Unable to load teams.");
      }
    }

    loadTeams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  function applyFilters() {
    const filters: GetTasksFilters = {};

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (teamId) filters.teamId = teamId;

    if (assignedToMe && user?.id) {
      filters.assignedToId = user.id;
    }

    setRefreshing(true);
    setAppliedFilters(filters);
    setActiveFilter(null);
  }

  function clearFilters() {
    setStatus(undefined);
    setPriority(undefined);
    setTeamId(undefined);
    setAssignedToMe(false);

    setRefreshing(true);
    setAppliedFilters({});
    setActiveFilter(null);
  }

  function getSelectedFilterLabel(type: FilterType) {
    if (type === "status") {
      return statusOptions.find((option) => option.value === status)?.label;
    }

    if (type === "priority") {
      return priorityOptions.find((option) => option.value === priority)?.label;
    }

    if (type === "team") {
      return teams.find((team) => team.id === teamId)?.name ?? "All teams";
    }

    return "";
  }

  // Count currently applied filters
  function getActiveFilterCount() {
    return Object.keys(appliedFilters).length;
  }

  function formatDate(date: string | null) {
    if (!date) return "No deadline";
    return new Date(date).toLocaleDateString();
  }

  function getStatusColor(taskStatus: Task["status"]) {
    switch (taskStatus) {
      case "COMPLETED":
        return colors.success;
      case "IN_PROGRESS":
        return colors.primary;
      case "IN_REVIEW":
        return colors.warning;
      case "CANCELLED":
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  }

  function getPriorityColor(taskPriority: Task["priority"]) {
    switch (taskPriority) {
      case "URGENT":
        return colors.danger;
      case "HIGH":
        return colors.warning;
      case "MEDIUM":
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  }

  function renderTask({ item }: { item: Task }) {
    return (
      <Pressable
        style={styles.taskCard}
        onPress={() =>
          router.push({
            pathname: "/tasks/[taskId]",
            params: { taskId: item.id },
          })
        }
      >
        <Text style={styles.taskTitle}>{item.title}</Text>

        <Text style={styles.teamName}>{item.team.name}</Text>

        <View style={styles.badges}>
          <Text
            style={[
              styles.badge,
              {
                color: getStatusColor(item.status),
                backgroundColor: `${getStatusColor(item.status)}15`,
              },
            ]}
          >
            {item.status.replace("_", " ")}
          </Text>

          <Text
            style={[
              styles.badge,
              {
                color: getPriorityColor(item.priority),
                backgroundColor: `${getPriorityColor(item.priority)}15`,
              },
            ]}
          >
            {item.priority}
          </Text>
        </View>

        <View style={styles.taskFooter}>
          <Text style={styles.deadline}>Due: {formatDate(item.dueDate)}</Text>

          {item.isOverdue && <Text style={styles.overdue}>Overdue</Text>}
        </View>

        <Text style={styles.assignee}>
          Assigned to:{" "}
          {item.assignedTo
            ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
            : "Unassigned"}
        </Text>

        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>View details</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </Pressable>
    );
  }

  function renderFilterOptions() {
    if (activeFilter === "status") {
      return statusOptions.map((option) => (
        <Pressable
          key={option.label}
          style={styles.option}
          onPress={() => {
            setStatus(option.value);
            setActiveFilter(null);
          }}
        >
          <Text style={styles.optionText}>{option.label}</Text>
          {status === option.value && (
            <Ionicons name="checkmark" size={20} color={colors.primary} />
          )}
        </Pressable>
      ));
    }

    if (activeFilter === "priority") {
      return priorityOptions.map((option) => (
        <Pressable
          key={option.label}
          style={styles.option}
          onPress={() => {
            setPriority(option.value);
            setActiveFilter(null);
          }}
        >
          <Text style={styles.optionText}>{option.label}</Text>
          {priority === option.value && (
            <Ionicons name="checkmark" size={20} color={colors.primary} />
          )}
        </Pressable>
      ));
    }

    if (activeFilter === "team") {
      return (
        <>
          <Pressable
            style={styles.option}
            onPress={() => {
              setTeamId(undefined);
              setActiveFilter(null);
            }}
          >
            <Text style={styles.optionText}>All teams</Text>
            {!teamId && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </Pressable>

          {teams.map((team) => (
            <Pressable
              key={team.id}
              style={styles.option}
              onPress={() => {
                setTeamId(team.id);
                setActiveFilter(null);
              }}
            >
              <Text style={styles.optionText}>{team.name}</Text>
              {teamId === team.id && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.heading}>Tasks</Text>
            <Text style={styles.subtitle}>Welcome, {user?.firstName}</Text>
          </View>

          {canCreateTask && (
            <Pressable
              style={styles.createTaskButton}
              onPress={() => router.push("/tasks/create")}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.createTaskButtonText}>Create Task</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Collapsible Filters */}
      <View style={styles.filters}>
        <Pressable
          style={styles.filterHeader}
          onPress={() => setFiltersExpanded((previous) => !previous)}
        >
          <View style={styles.filterHeaderLeft}>
            <Ionicons name="options-outline" size={22} color={colors.primary} />
            <Text style={styles.filterHeading}>Filter tasks</Text>

            {getActiveFilterCount() > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>
                  {getActiveFilterCount()}
                </Text>
              </View>
            )}
          </View>

          <Ionicons
            name={filtersExpanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={colors.primary}
          />
        </Pressable>

        {filtersExpanded && (
          <View>
            <View style={styles.filterRow}>
              <Pressable
                style={styles.filterButton}
                onPress={() => setActiveFilter("status")}
              >
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.filterButtonText} numberOfLines={1}>
                  {getSelectedFilterLabel("status")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                style={styles.filterButton}
                onPress={() => setActiveFilter("priority")}
              >
                <Ionicons
                  name="flag-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.filterButtonText} numberOfLines={1}>
                  {getSelectedFilterLabel("priority")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.teamFilterButton}
              onPress={() => setActiveFilter("team")}
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={colors.primary}
              />
              <Text style={styles.filterButtonText} numberOfLines={1}>
                Team: {getSelectedFilterLabel("team")}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.textSecondary}
              />
            </Pressable>

            {teamsError ? (
              <Text style={styles.teamsError}>{teamsError}</Text>
            ) : null}

            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={colors.primary}
                />
                <Text style={styles.switchLabel}>Assigned to me only</Text>
              </View>

              <Switch
                value={assignedToMe}
                onValueChange={setAssignedToMe}
                trackColor={{
                  false: colors.border,
                  true: colors.primaryLight,
                }}
                thumbColor={assignedToMe ? colors.primary : colors.white}
              />
            </View>

            <View style={styles.filterActions}>
              <Pressable style={styles.clearButton} onPress={clearFilters}>
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.clearButtonText}>Clear filters</Text>
              </Pressable>

              <Pressable style={styles.applyButton} onPress={applyFilters}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={colors.white}
                />
                <Text style={styles.applyButtonText}>Apply filters</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {!error && (
        <View style={styles.taskCountContainer}>
          <Text style={styles.taskCountText}>
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} found
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry} onPress={loadTasks}>
            Tap to retry
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={
            tasks.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tasks found.</Text>
          }
        />
      )}

      {/* Filter selection modal */}
      <Modal
        visible={activeFilter !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveFilter(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveFilter(null)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Select {activeFilter}</Text>

            <ScrollView>{renderFilterOptions()}</ScrollView>

            <Pressable
              style={styles.modalClose}
              onPress={() => setActiveFilter(null)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskCountContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  taskCountText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  createTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9,
    gap: spacing.xs,
  },

  createTaskButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // Filter container
  filters: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
  },
  filterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  filterHeading: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  filterCountBadge: {
    backgroundColor: colors.primaryLight,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  filterCountText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },

  // Status and priority selectors
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // Full-width Team selector
  teamFilterButton: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  teamsError: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.sm,
  },

  // Assigned to me switch
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  switchLabel: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // Filter action buttons
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9,
  },
  applyButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },

  // Task list
  list: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardActionText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.xs,
  },
  taskTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  teamName: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  badges: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  deadline: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  overdue: {
    fontSize: typography.fontSize.sm,
    color: colors.danger,
    fontWeight: typography.fontWeight.semibold,
  },
  assignee: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Loading, errors and empty states
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  retry: {
    color: colors.primary,
    marginTop: spacing.md,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },

  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: "capitalize",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.fontSize.md,
  },
  modalClose: {
    alignItems: "center",
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  modalCloseText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
