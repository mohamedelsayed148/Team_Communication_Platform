import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/features/auth/auth.context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { TeamDetails } from "@/src/features/teams/teams.types";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

import {
  getTeamById,
  updateTeamMemberRole,
  removeTeamMember,
} from "@/src/features/teams/teams.api";

export default function TeamDetailsScreen() {
  const { user } = useAuth();

  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();

  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(
    null,
  );

  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/teams");
    }
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadTeam = useCallback(
    async (showLoader = false) => {
      if (!teamId) {
        setError("Team ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const result = await getTeamById(teamId);
        setTeam(result);
      } catch (err: any) {
        setTeam(null);

        if (err?.response?.status === 403) {
          setError(
            "You are not a member of this team and cannot view its details.",
          );
        } else if (err?.response?.status === 404) {
          setError("This team could not be found.");
        } else {
          setError(
            err?.response?.data?.message || "Unable to load team details.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [teamId],
  );

  useEffect(() => {
    void loadTeam(true);
  }, [loadTeam]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadTeam();
  };

  const confirmAction = (
    title: string,
    message: string,
    confirmText: string,
    onConfirm: () => void,
    destructive = false,
  ) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${title}\n\n${message}`);

      if (confirmed) {
        onConfirm();
      }

      return;
    }

    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: confirmText,
        style: destructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ]);
  };

  const handleChangeRole = (
    userId: string,
    currentRole: "LEADER" | "MEMBER",
  ) => {
    if (processingMemberId) return;

    const newRole = currentRole === "LEADER" ? "MEMBER" : "LEADER";

    confirmAction(
      "Change Member Role",
      `Are you sure you want to change this member's role to ${newRole}?`,
      "Confirm",
      async () => {
        try {
          setProcessingMemberId(userId);

          await updateTeamMemberRole(teamId, userId, {
            role: newRole,
          });

          await loadTeam();

          showMessage("Success", "Member role updated successfully.");
        } catch (err: any) {
          showMessage(
            "Unable to update role",
            err?.response?.data?.message || "Something went wrong.",
          );
        } finally {
          setProcessingMemberId(null);
        }
      },
    );
  };

  const handleRemoveMember = (userId: string, memberName: string) => {
    if (processingMemberId) return;

    confirmAction(
      "Remove Team Member",
      `Are you sure you want to remove ${memberName} from this team?`,
      "Remove",
      async () => {
        try {
          setProcessingMemberId(userId);

          await removeTeamMember(teamId, userId);

          // Remove the member immediately from the displayed list.
          setTeam((currentTeam) => {
            if (!currentTeam) return currentTeam;

            const updatedMembers = currentTeam.members.filter(
              (member) => member.user.id !== userId,
            );

            return {
              ...currentTeam,
              members: updatedMembers,
              _count: {
                ...currentTeam._count,
                members: updatedMembers.length,
              },
            };
          });

          // Fetch the latest team data from the backend.
          await loadTeam();

          showMessage("Success", "Member removed successfully.");
        } catch (err: any) {
          showMessage(
            "Unable to remove member",
            err?.response?.data?.message || "Something went wrong.",
          );

          await loadTeam();
        } finally {
          setProcessingMemberId(null);
        }
      },
      true,
    );
  };

  const currentMembership = team?.members.find(
    (member) => member.user.id === user?.id,
  );

  const canEditTeam = isAdmin || currentMembership?.role === "LEADER";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Team Details</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error || !team ? (
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.danger}
            />

            <Text style={styles.errorText}>
              {error || "Unable to load team."}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => void loadTeam(true)}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>

            <Pressable onPress={goBack}>
              <Text style={styles.backText}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.headerCard}>
              <Text style={styles.teamName}>{team.name}</Text>

              <Text style={styles.description}>
                {team.description || "No description provided."}
              </Text>

              <View style={styles.memberCount}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={colors.primary}
                />

                <Text style={styles.memberCountText}>
                  {team._count.members}{" "}
                  {team._count.members === 1 ? "member" : "members"}
                </Text>
              </View>
            </View>

            {canEditTeam && (
              <Pressable
                style={styles.editButton}
                onPress={() =>
                  router.push({
                    pathname: "/teams/edit/[teamId]",
                    params: { teamId: team.id },
                  })
                }
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.editButtonText}>Edit Team</Text>
              </Pressable>
            )}

            {isAdmin && (
              <Pressable
                style={styles.addMemberButton}
                onPress={() =>
                  router.push({
                    pathname: "/teams/add-member/[teamId]",
                    params: { teamId: team.id },
                  })
                }
              >
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.editButtonText}>Add Member</Text>
              </Pressable>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Created By</Text>

              <View style={styles.personCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {team.createdBy.firstName.charAt(0)}
                    {team.createdBy.lastName.charAt(0)}
                  </Text>
                </View>

                <View style={styles.personInfo}>
                  <Text style={styles.personName}>
                    {team.createdBy.firstName} {team.createdBy.lastName}
                  </Text>

                  <Text style={styles.personEmail}>{team.createdBy.email}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Team Members ({team.members.length})
              </Text>

              {team.members.map((member) => {
                const isLeader = member.role === "LEADER";
                const isProcessing = processingMemberId === member.user.id;

                return (
                  <View key={member.user.id} style={styles.personCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {member.user.firstName.charAt(0)}
                        {member.user.lastName.charAt(0)}
                      </Text>
                    </View>

                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>
                        {member.user.firstName} {member.user.lastName}
                        {member.user.id === user?.id ? " (You)" : ""}
                      </Text>

                      <Text style={styles.personEmail}>
                        {member.user.email}
                      </Text>

                      <View
                        style={[
                          styles.roleBadge,
                          isLeader ? styles.leaderBadge : styles.memberBadge,
                        ]}
                      >
                        <Ionicons
                          name={isLeader ? "ribbon" : "person-outline"}
                          size={14}
                          color={
                            isLeader ? colors.primary : colors.textSecondary
                          }
                        />

                        <Text
                          style={[
                            styles.memberRole,
                            isLeader
                              ? styles.leaderRoleText
                              : styles.regularRoleText,
                          ]}
                        >
                          {isLeader ? "Team Leader" : "Member"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            member.user.status === "ACTIVE"
                              ? colors.success
                              : colors.textSecondary,
                        },
                      ]}
                    />

                    {isAdmin && member.user.id !== user?.id && (
                      <View style={styles.memberActions}>
                        <Pressable
                          style={styles.memberActionButton}
                          disabled={!!processingMemberId}
                          onPress={() =>
                            handleChangeRole(member.user.id, member.role)
                          }
                        >
                          {isProcessing ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.primary}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="swap-horizontal-outline"
                                size={18}
                                color={colors.primary}
                              />

                              <Text style={styles.memberActionText}>
                                {isLeader ? "Demote" : "Promote"}
                              </Text>
                            </>
                          )}
                        </Pressable>

                        <Pressable
                          style={styles.removeMemberButton}
                          disabled={!!processingMemberId}
                          onPress={() =>
                            handleRemoveMember(
                              member.user.id,
                              `${member.user.firstName} ${member.user.lastName}`,
                            )
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={
                              processingMemberId
                                ? colors.textSecondary
                                : colors.danger
                            }
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}

              {team.members.length === 0 && (
                <Text style={styles.emptyText}>No team members found.</Text>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  editButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  editButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  addMemberButton: {
    backgroundColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  teamName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  memberCount: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  memberCountText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberActions: {
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  memberActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: spacing.xs,
  },
  memberActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  removeMemberButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  personEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  leaderBadge: {
    backgroundColor: colors.primaryLight,
  },
  memberBadge: {
    backgroundColor: colors.background,
  },
  memberRole: {
    fontSize: 12,
    fontWeight: "600",
  },
  leaderRoleText: {
    color: colors.primary,
  },
  regularRoleText: {
    color: colors.textSecondary,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  retryText: {
    color: colors.white,
    fontWeight: "600",
  },
  backText: {
    color: colors.primary,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
