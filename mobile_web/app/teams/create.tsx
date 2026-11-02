import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppInput from "@/components/ui/AppInput";
import AppButton from "@/components/ui/AppButton";
import { createTeam } from "@/src/features/teams/teams.api";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function CreateTeamScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  const goToTeams = () => {
    router.replace("/(tabs)/teams");
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      goToTeams();
    }
  };

  const handleCreateTeam = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setNameError("Team name must be between 2 and 100 characters.");
      return;
    }

    if (trimmedDescription.length > 500) {
      Alert.alert(
        "Invalid description",
        "Description cannot exceed 500 characters.",
      );
      return;
    }

    try {
      setLoading(true);
      setNameError("");

      await createTeam({
        name: trimmedName,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      });

      // Navigate directly instead of relying on Alert.alert's callback.
      goToTeams();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to create team.";

      Alert.alert("Create Team Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Create Team</Text>
        </View>

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
            <Text style={styles.heading}>Create a New Team</Text>

            <Text style={styles.subtitle}>
              Enter the details below to create your team.
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
              placeholder="Describe the purpose of this team"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.characterCount}>
              {description.length}/500 characters
            </Text>

            <AppButton
              title="Create Team"
              onPress={handleCreateTeam}
              loading={loading}
              disabled={loading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
    marginBottom: spacing.xl,
  },
});
