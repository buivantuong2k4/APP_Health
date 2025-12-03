import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../constants/theme";

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  color?: string; // bar color
  backgroundColor?: string; // track color
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 6,
  color,
  backgroundColor,
}) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.progress,
          {
            width: `${clampedProgress * 100}%`,
            height,
            backgroundColor: color || styles.progress.backgroundColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.inputUnderline,
    borderRadius: 3,
    overflow: "hidden",
  },
  progress: {
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});
