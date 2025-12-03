import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { colors, typography } from "../constants/theme";

interface LoginInputProps extends TextInputProps {
  placeholder: string;
}

export default function LoginInput({ placeholder, ...props }: LoginInputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.inputPlaceholder}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.inputUnderline,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 24,
    fontSize: typography.body.fontSize,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textBody,
  },
});
