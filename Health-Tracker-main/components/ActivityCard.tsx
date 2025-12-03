import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../constants/theme";

interface ActivityCardProps {
  icon: string;
  label: string;
  value: string;
  unit: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  icon,
  label,
  value,
  unit,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.cardSoftBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginTop: 8,
    flexWrap: "wrap",
  },
  value: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    textAlign: "center",
  },
  unit: {
    fontSize: 11,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginLeft: 6,
  },
});
