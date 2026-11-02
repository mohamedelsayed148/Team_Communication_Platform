import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { getTeamById, addTeamMember } from "@/src/features/teams/teams.api";
import { getUsers } from "@/src/features/users/users.api";

import type { TeamDetails } from "@/src/features/teams/teams.types";
import type { User } from "@/src/features/users/users.types";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function AddTeamMemberScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();

  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

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

  const loadData = useCallback(
    async (searchTerm = "", showLoader = false) => {
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

        const [teamResult, usersResult] = await Promise.all([
          getTeamById(teamId),
          getUsers({
            page: 1,
            limit: 100,
            status: "ACTIVE",
            search: searchTerm.trim() || undefined,
          }),
        ]);

        setTeam(teamResult);

        const existingMemberIds = new Set(
          teamResult.members.map((member) => member.user.id),
        );

        const availableUsers = usersResult.data.filter(
          (user) => user.status === "ACTIVE" && !existingMemberIds.has(user.id),
        );

        setUsers(availableUsers);

        setSelectedUserId((current) =>
          current && availableUsers.some((user) => user.id === current)
            ? current
            : null,
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Unable to load available users.",
        );
      } finally {
        setLoading(false);
      }
    },
    [teamId],
  );

  useEffect(() => {
    void loadData("", true);
  }, [loadData]);

  const handleSearch = (value: string) => {
    setSearch(value);
    void loadData(value);
  };

  const handleAddMember = async () => {
    if (!selectedUserId || adding) {
      if (!selectedUserId) {
        showMessage("Select a user", "Please select a user to add.");
      }
      return;
    }

    try {
      setAdding(true);

      await addTeamMember(teamId, {
        userId: selectedUserId,
      });

      if (Platform.OS === "web") {
        window.alert("The user has been added to the team.");

        router.replace({
          pathname: "/teams/[teamId]",
          params: { teamId },
        });
      } else {
        Alert.alert("Success", "The user has been added to the team.", [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/teams/[teamId]",
                params: { teamId },
              }),
          },
        ]);
      }
    } catch (err: any) {
      showMessage(
        "Unable to add member",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setAdding(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const selected = selectedUserId === item.id;

    return (
      <Pressable
        style={[styles.userCard, selected && styles.selectedUserCard]}
        onPress={() => setSelectedUserId(item.id)}
        disabled={adding}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName.charAt(0)}
            {item.lastName.charAt(0)}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>

        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={23}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Add Team Member</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : error || !team ? (
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color={colors.danger}
            />

            <Text style={styles.errorText}>
              {error || "Unable to load team."}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => void loadData(search, true)}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>

            <Pressable onPress={goBack} style={styles.backLink}>
              <Text style={styles.backText}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.container}>
              <Text style={styles.teamTitle}>Add member to</Text>
              <Text style={styles.teamName}>{team.name}</Text>

              <View style={styles.searchContainer}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={colors.textSecondary}
                />

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  editable={!adding}
                />

                {search.length > 0 && (
                  <Pressable onPress={() => handleSearch("")} disabled={adding}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>

              <Text style={styles.sectionTitle}>
                Available Users ({users.length})
              </Text>

              <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No available users found.
                  </Text>
                }
              />

              <Pressable
                style={[
                  styles.addButton,
                  (!selectedUserId || adding) && styles.disabledButton,
                ]}
                onPress={handleAddMember}
                disabled={!selectedUserId || adding}
              >
                {adding ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color={colors.white}
                    />
                    <Text style={styles.addButtonText}>Add Selected User</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
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
    padding: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  teamTitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  teamName: {
    fontSize: 21,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedUserCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: "600",
  },
  backLink: {
    marginTop: spacing.md,
  },
  backText: {
    color: colors.primary,
    fontWeight: "600",
  },
});
