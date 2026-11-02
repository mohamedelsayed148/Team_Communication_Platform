import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { Team } from "@/src/features/teams/teams.types";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

import { useAuth } from "@/src/features/auth/auth.context";
import { getTeams, deleteTeam } from "@/src/features/teams/teams.api";

type TeamFilter = "ALL" | "MINE" | "LEADING";

export default function TeamsScreen() {
  const router = useRouter();

  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<TeamFilter>("ALL");

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchTeams = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const data = await getTeams();
      setTeams(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load teams. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const deleteTeamRequest = async (team: Team) => {
    if (deletingTeamId) return;

    try {
      setDeletingTeamId(team.id);

      await deleteTeam(team.id);

      // Remove the deleted team immediately from the UI.
      setTeams((currentTeams) =>
        currentTeams.filter((currentTeam) => currentTeam.id !== team.id),
      );

      showMessage("Success", "Team deleted successfully.");

      // Refresh the list to ensure it matches the backend.
      await fetchTeams(true);
    } catch (err: any) {
      showMessage(
        "Error",
        err?.response?.data?.message ||
          "Unable to delete this team. Please try again.",
      );
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleDeleteTeam = (team: Team) => {
    const message = `Are you sure you want to delete "${team.name}"? This action cannot be undone.`;

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Delete Team\n\n${message}`);

      if (confirmed) {
        void deleteTeamRequest(team);
      }

      return;
    }

    Alert.alert("Delete Team", message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteTeamRequest(team);
        },
      },
    ]);
  };

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  // Apply the selected filter and search query.
  const filteredTeams = useMemo(() => {
    let result = [...teams];

    if (isAdmin) {
      if (activeFilter === "MINE") {
        result = result.filter((team) => team.myRole !== null);
      } else if (activeFilter === "LEADING") {
        result = result.filter((team) => team.myRole === "LEADER");
      }
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((team) => {
        const name = team.name.toLowerCase();
        const description = team.description?.toLowerCase() ?? "";

        return name.includes(query) || description.includes(query);
      });
    }

    return result;
  }, [teams, isAdmin, activeFilter, searchQuery]);

  const renderTeam = ({ item }: { item: Team }) => {
    const isLeader = item.myRole === "LEADER";
    const isMember = item.myRole !== null;
    const isDeleting = deletingTeamId === item.id;

    return (
      <View style={styles.teamCard}>
        <TouchableOpacity
          style={styles.teamCardContent}
          activeOpacity={0.75}
          disabled={isDeleting}
          onPress={() => router.push(`/teams/${item.id}`)}
        >
          <View style={styles.teamIcon}>
            <Ionicons name="people" size={25} color={colors.primary} />
          </View>

          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.name}</Text>

            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : (
              <Text style={styles.noDescription}>No description provided</Text>
            )}

            <View style={styles.teamMeta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={colors.textSecondary}
                />

                <Text style={styles.metaText}>
                  {item.memberCount}{" "}
                  {item.memberCount === 1 ? "member" : "members"}
                </Text>
              </View>

              <View
                style={[
                  styles.roleBadge,
                  isLeader
                    ? styles.leaderBadge
                    : isMember
                      ? styles.memberBadge
                      : styles.notMemberBadge,
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    isLeader
                      ? styles.leaderText
                      : isMember
                        ? styles.memberText
                        : styles.notMemberText,
                  ]}
                >
                  {isLeader ? "Leader" : isMember ? "Member" : "Not a member"}
                </Text>
              </View>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[
              styles.deleteButton,
              isDeleting && styles.deleteButtonDisabled,
            ]}
            activeOpacity={0.7}
            disabled={Boolean(deletingTeamId)}
            onPress={() => handleDeleteTeam(item)}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{isAdmin ? "All Teams" : "My Teams"}</Text>

          <Text style={styles.subtitle}>
            {isAdmin
              ? "View and manage all platform teams"
              : "Manage your teams and members"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.8}
          onPress={() => router.push("/teams/create")}
        >
          <Ionicons name="add" size={21} color={colors.white} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={21}
          color={colors.textSecondary}
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Search teams by name or description..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={21}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Admin filters */}
      {isAdmin && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === "ALL" && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter("ALL")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "ALL" && styles.activeFilterText,
              ]}
            >
              All Teams
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === "MINE" && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter("MINE")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "MINE" && styles.activeFilterText,
              ]}
            >
              My Teams
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === "LEADING" && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter("LEADING")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "LEADING" && styles.activeFilterText,
              ]}
            >
              Teams I Lead
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results count */}
      {!loading && !error && (
        <Text style={styles.resultsCount}>
          {filteredTeams.length}{" "}
          {filteredTeams.length === 1 ? "team found" : "teams found"}
        </Text>
      )}

      {/* Loading / Error / Team List */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.danger}
          />

          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void fetchTeams()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => item.id}
          renderItem={renderTeam}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            filteredTeams.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchTeams(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={56}
                color={colors.textSecondary}
              />

              <Text style={styles.emptyTitle}>
                {searchQuery.trim() || activeFilter !== "ALL"
                  ? "No matching teams"
                  : "No teams yet"}
              </Text>

              <Text style={styles.emptyDescription}>
                {searchQuery.trim()
                  ? "Try another search term."
                  : activeFilter === "MINE"
                    ? "You don't belong to any teams yet."
                    : activeFilter === "LEADING"
                      ? "You are not leading any teams yet."
                      : "Create a team to start collaborating with others."}
              </Text>

              {(searchQuery.length > 0 || activeFilter !== "ALL") && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery("");
                    setActiveFilter("ALL");
                  }}
                >
                  <Text style={styles.clearFiltersText}>
                    Clear search and filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
  },
  createButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: colors.text,
    fontSize: typography.fontSize.sm,
  },
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  activeFilterText: {
    color: colors.white,
  },
  resultsCount: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  noDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  teamMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  leaderBadge: {
    backgroundColor: colors.primaryLight,
  },
  memberBadge: {
    backgroundColor: colors.background,
  },
  notMemberBadge: {
    backgroundColor: "#F3F4F6",
  },
  roleText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  leaderText: {
    color: colors.primary,
  },
  memberText: {
    color: colors.textSecondary,
  },
  notMemberText: {
    color: "#6B7280",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    marginTop: spacing.md,
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
    fontWeight: typography.fontWeight.semibold,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  clearFiltersButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
});
