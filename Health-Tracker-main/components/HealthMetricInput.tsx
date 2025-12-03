import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, typography } from "../constants/theme";

interface HealthMetricInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  keyboardType?: "numeric" | "default" | "phone-pad" | "email-address";
  placeholder?: string;
}

export const HealthMetricInput: React.FC<HealthMetricInputProps> = ({
  label,
  value,
  onChangeText,
  unit = "",
  keyboardType = "numeric",
  placeholder = "",
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textBody,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoftBg,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textHeading,
    padding: 0,
  },
  unit: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginLeft: 8,
  },
});
