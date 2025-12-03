import { StyleSheet } from "react-native";
import { colors, shadows, typography } from "./theme";

export const authScreenStyles = StyleSheet.create({
  // Common layouts
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
  },

  // Header and Typography
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  appTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    letterSpacing: 2,
  },

  // Card and Form
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    marginBottom: 28,
    textAlign: "center",
  },

  // Input fields
  inputsContainer: {
    marginBottom: 16,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotPassword: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },

  // Buttons and Links
  signupPromptContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
  },
  signupPromptText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },
  signupPromptLink: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  signinPromptContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
  },
  signinPromptText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },
  signinPromptLink: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  backToLoginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  backToLoginText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },
  backToLoginLink: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },

  // Social Buttons
  socialContainer: {
    marginVertical: 8,
  },

  // Description (for forgot password)
  description: {
    fontSize: 13,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
});
