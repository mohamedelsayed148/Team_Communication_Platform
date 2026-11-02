import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
} from "react-native";

import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function AppInput({
  label,
  error,
  style,
  ...inputProps
}: AppInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...inputProps}
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.textSecondary}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.fontSize.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
  },
});
