import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppInput from "@/components/ui/AppInput";
import AppButton from "@/components/ui/AppButton";

import { getTeamById, updateTeam } from "@/src/features/teams/teams.api";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function EditTeamScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [loadError, setLoadError] = useState("");

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

  const loadTeam = useCallback(async () => {
    if (!teamId) {
      setLoadError("Team ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const team = await getTeamById(teamId);

      setName(team.name);
      setDescription(team.description ?? "");
    } catch (error: any) {
      setLoadError(
        error?.response?.data?.message || "Unable to load team information.",
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleUpdateTeam = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setNameError("Team name must be between 2 and 100 characters.");
      return;
    }

    if (trimmedDescription.length > 500) {
      showMessage(
        "Invalid description",
        "Description cannot exceed 500 characters.",
      );
      return;
    }

    try {
      setSaving(true);
      setNameError("");

      await updateTeam(teamId, {
        name: trimmedName,
        description: trimmedDescription || null,
      });

      if (Platform.OS === "web") {
        window.alert("Team updated successfully.");

        router.replace({
          pathname: "/teams/[teamId]",
          params: { teamId },
        });
      } else {
        Alert.alert("Success", "Team updated successfully.", [
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
    } catch (error: any) {
      showMessage(
        "Update Failed",
        error?.response?.data?.message || "Unable to update team.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Team</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : loadError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{loadError}</Text>

            <AppButton
              title="Try Again"
              onPress={() => {
                void loadTeam();
              }}
            />

            <View style={styles.buttonSpacing} />

            <AppButton title="Go Back" variant="outline" onPress={goBack} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.heading}>Edit Team Information</Text>

              <Text style={styles.subtitle}>
                Update your team's name and description.
              </Text>

              <AppInput
                label="Team Name"
                placeholder="Enter team name"
                value={name}
                onChangeText={(value: string) => {
                  setName(value);
                  if (nameError) setNameError("");
                }}
                error={nameError}
              />

              <AppInput
                label="Description (Optional)"
                placeholder="Enter team description"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.characterCount}>
                {description.length}/500 characters
              </Text>

              <AppButton
                title="Save Changes"
                onPress={handleUpdateTeam}
                loading={saving}
                disabled={saving}
              />

              <View style={styles.cancelButton}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={goBack}
                  disabled={saving}
                />
              </View>
            </ScrollView>
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
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  characterCount: {
    textAlign: "right",
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  buttonSpacing: {
    height: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});
