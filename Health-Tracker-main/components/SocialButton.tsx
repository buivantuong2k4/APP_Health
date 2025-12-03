import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";
import { colors, typography } from "../constants/theme";

interface SocialButtonProps extends TouchableOpacityProps {
  icon: string;
  label: string;
}

export default function SocialButton({
  icon,
  label,
  ...props
}: SocialButtonProps) {
  return (
    <TouchableOpacity style={styles.button} {...props}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.socialButtonBg,
    borderWidth: 1,
    borderColor: colors.socialButtonBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    color: colors.socialButtonText,
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    flex: 1,
    textAlign: "center",
  },
});
