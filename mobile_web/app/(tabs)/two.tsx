import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import { useAuth } from "@/src/features/auth/auth.context";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.firstName, user?.lastName]);

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  function handleCancelEdit() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setIsEditing(false);
  }

  async function handleSaveProfile() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      showMessage(
        "Invalid information",
        "First name and last name are required.",
      );
      return;
    }

    if (trimmedFirstName.length > 100 || trimmedLastName.length > 100) {
      showMessage("Invalid information", "Names cannot exceed 100 characters.");
      return;
    }

    if (
      trimmedFirstName === user?.firstName &&
      trimmedLastName === user?.lastName
    ) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);

      await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });

      setIsEditing(false);

      showMessage("Success", "Your profile has been updated successfully.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Something went wrong while updating your profile.";

      showMessage("Update failed", message);
    } finally {
      setSaving(false);
    }
  }

  async function performLogout() {
    try {
      setLoading(true);
      await logout();
    } catch {
      showMessage("Logout failed", "Something went wrong while logging out.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    if (loading || saving) return;

    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to log out?");

      if (confirmed) {
        void performLogout();
      }

      return;
    }

    Alert.alert("Logout", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  }

  const avatarInitial = user?.firstName?.charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>

        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>

        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          {!isEditing && (
            <AppButton
              title="Edit Profile"
              variant="outline"
              onPress={() => setIsEditing(true)}
            />
          )}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <AppInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />

            <AppInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />

            <View style={styles.buttonGroup}>
              <AppButton
                title="Save Changes"
                onPress={handleSaveProfile}
                loading={saving}
                disabled={saving}
              />

              <AppButton
                title="Cancel"
                variant="outline"
                onPress={handleCancelEdit}
                disabled={saving}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>First Name</Text>
              <Text style={styles.value}>{user?.firstName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Last Name</Text>
              <Text style={styles.value}>{user?.lastName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Roles</Text>
              <Text style={styles.value}>
                {user?.roles?.join(", ") || "No roles assigned"}
              </Text>
            </View>
          </>
        )}
      </View>

      <AppButton
        title="Logout"
        variant="outline"
        onPress={handleLogout}
        loading={loading}
        disabled={loading || saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  name: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  email: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  infoRow: {
    width: "100%",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  editForm: {
    width: "100%",
    gap: spacing.md,
  },
  buttonGroup: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
