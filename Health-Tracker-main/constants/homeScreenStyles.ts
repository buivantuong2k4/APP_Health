import { StyleSheet } from "react-native";
import { colors, typography } from "./theme";

export const homeScreenStyles = StyleSheet.create({
  // Common layouts
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Header and Typography
  progressSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    marginBottom: 4,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    marginBottom: 16,
    marginTop: 24,
  },

  // Input fields
  section: {
    marginBottom: 32,
  },
  valueInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textHeading,
    padding: 0,
  },
  unitText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Buttons
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 16,
    width: "100%",
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },

  // Add buttons
  addButton: {
    backgroundColor: colors.cardSoftBg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  addMoreButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  addMoreButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },

  // Activity and container
  activitiesContainer: {
    marginBottom: 16,
  },
  targetsContainer: {
    marginBottom: 16,
  },
  targetSectionContainer: {
    marginTop: 24,
  },
  activityInputWrapper: {
    backgroundColor: colors.cardSoftBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputUnderline,
    padding: 16,
    marginBottom: 12,
  },
  activityItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  activityItemIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  activityItemLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textHeading,
  },

  // Remove button
  removeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
  },
  closeButton: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textMuted,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoftBg,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalItemIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  modalItemLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textHeading,
  },

  // Recommendation Screen
  recommendationsContainer: {
    marginBottom: 24,
  },
  recommendationCard: {
    backgroundColor: colors.cardSoftBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 16,
    marginBottom: 12,
  },
  recommendationCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(39, 177, 169, 0.08)",
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  recommendationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  descriptionItem: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textMuted,
    marginBottom: 8,
  },
  viewDetailsLink: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },

  // Menu and Sidebar
  headerWithMenu: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.primary,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuIcon: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },

  // Sidebar
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    flexDirection: "row",
  },
  sidebarContent: {
    backgroundColor: colors.background,
    width: "75%",
    height: "100%",
    paddingTop: 0,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },
  sidebarTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },
  sidebarCloseButton: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    paddingRight: 8,
  },
  sidebarBody: {
    paddingTop: 8,
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginVertical: 6,
    marginHorizontal: 12,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
    borderRadius: 12,
    backgroundColor: "rgba(39, 177, 169, 0.08)",
  },
  sidebarItemText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textHeading,
  },

  // Plan Details Modal
  detailsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  detailsContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  detailsCloseButton: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  detailsCloseIcon: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
  },
  detailsIcon: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    textAlign: "center",
    marginBottom: 24,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    marginBottom: 12,
  },
  detailsDescriptionItem: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 20,
  },
  detailsTipsText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  detailsDescription: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    lineHeight: 20,
  },
  detailsCloseButtonBottom: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  detailsCloseButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },

  // Dashboard Screen Styles
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  dashboardTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    flex: 1,
  },
  dashboardHeaderIcon: {
    fontSize: 24,
  },
  metricsSection: {
    marginBottom: 24,
  },
  metricsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  calorieCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  calorieTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    marginBottom: 20,
  },
  calorieContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 23,
  },
  circleContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    flexShrink: 0,
  },
  circleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    overflow: "hidden",
  },
  circleArc: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 25,
    borderColor: colors.textOnPrimary,
    borderTopColor: colors.textOnPrimary,
    borderRightColor: colors.textOnPrimary,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    position: "absolute",
  },
  circleInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  percentageText: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: 160,
    height: 160,
  },
  percentage: {
    fontSize: 32,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    textAlign: "center",
    zIndex: 2,
  },
  calorieStats: {
    flex: 1,
    marginLeft: 20,
  },
  statItem: {
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },
  statSeparator: {
    fontSize: 16,
    color: colors.textOnPrimary,
    opacity: 0.5,
    marginVertical: 8,
  },

  // Reports Screen Styles
  reportsNotificationIcon: {
    fontSize: 20,
    position: "absolute",
    right: 20,
    top: 12,
  },
  reportsHeaderSection: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reportsHeaderTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: colors.cardSoftBg,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  card: {
    backgroundColor: colors.cardSoftBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputUnderline,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputUnderline,
  },
  cardFooterText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },
  chartContainer: {
    marginVertical: 12,
  },
  yAxisContainer: {
    position: "absolute",
    left: 0,
    justifyContent: "space-between",
    height: 180,
    width: 30,
    zIndex: 1,
  },
  yAxisLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    textAlign: "right",
  },
  lineChartWrapper: {
    marginLeft: 30,
    height: 180,
    position: "relative",
    marginBottom: 8,
  },
  svgChart: {
    width: "100%",
    height: "100%",
  },
  dataPointsContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
  },
  dataPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.cardSoftBg,
  },
  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 30,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    flex: 1,
    textAlign: "center",
  },
  activityInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputUnderline,
  },
  activityLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginRight: 8,
  },
  activityValue: {
    fontSize: 13,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
  },
  barChartContainer: {
    marginVertical: 12,
  },
  barsWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
  },
  barItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 1,
  },
  bar: {
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },

  // Calendar Screen Styles
  calendarNotificationIcon: {
    fontSize: 20,
    position: "absolute",
    right: 20,
    top: 12,
  },
  calendarHeaderSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
    marginBottom: 4,
    flex: 1,
  },
  calendarSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 6,
  },
  daysContainer: {
    marginBottom: 16,
  },
  daysContentContainer: {
    paddingHorizontal: 0,
    gap: 6,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#F0F8F7",
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    borderWidth: 2,
    borderColor: "#E0F0ED",
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dayText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  dayTextActive: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  dateText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
  },
  dateTextActive: {
    color: colors.textOnPrimary,
    fontSize: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
    marginBottom: 16,
    marginTop: 8,
    fontStyle: "italic",
  },

  // Card content styles for Calendar and other screens
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  recTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    marginBottom: 6,
  },
  recDetails: {
    gap: 3,
  },
  recDetail: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textMuted,
  },
  recDescription: {
    fontSize: 11,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3.84,
    elevation: 4,
  },
  addButtonCircleText: {
    fontSize: 22,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },

  // Activity Detail Modal Styles (specific for calendar activity)
  activityDetailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  activityDetailIcon: {
    fontSize: 40,
  },
  activityDetailTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
    textAlign: "center",
    marginBottom: 24,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textMuted,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.textHeading,
  },
  startActivityButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 0,
  },
  startActivityButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.textOnPrimary,
  },
});
