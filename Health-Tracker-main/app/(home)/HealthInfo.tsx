import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"; // Icon đẹp
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ProgressBar } from "../../components/ProgressBar";
import { colors, typography } from "../../constants/theme";

// --- COMPONENT CON: INPUT CARD (Thay thế HealthMetricInput để đẹp hơn) ---
interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  placeholder?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  onChangeText,
  unit,
  placeholder,
}) => (
  <View style={localStyles.metricCard}>
    <View style={localStyles.metricHeader}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={colors.primary}
      />
      <Text style={localStyles.metricLabel}>{label}</Text>
    </View>
    <View style={localStyles.metricInputContainer}>
      <TextInput
        style={localStyles.metricInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        keyboardType="numeric"
        maxLength={5}
      />
      <Text style={localStyles.metricUnit}>{unit}</Text>
    </View>
  </View>
);

// --- COMPONENT CON: GOAL OPTION CARD ---
interface GoalOptionProps {
  id: string;
  icon: string;
  label: string;
  subLabel?: string;
  selected?: boolean;
  onSelect: (id: string) => void;
}

const GoalOption: React.FC<GoalOptionProps> = ({
  id,
  icon,
  label,
  subLabel,
  selected,
  onSelect,
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => onSelect(id)}
    style={[localStyles.goalCard, selected && localStyles.goalCardActive]}
  >
    <View
      style={[localStyles.iconCircle, selected && localStyles.iconCircleActive]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={selected ? "#FFF" : "#888"}
      />
    </View>
    <View style={localStyles.goalContent}>
      <Text style={[localStyles.goalTitle, selected && localStyles.textActive]}>
        {label}
      </Text>
      <Text style={localStyles.goalSub}>{subLabel}</Text>
    </View>
    {selected && (
      <Ionicons
        name="checkmark-circle"
        size={24}
        color={colors.primary}
        style={localStyles.checkIcon}
      />
    )}
  </TouchableOpacity>
);

export default function HealthInfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Metrics
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [sleepHours, setSleepHours] = useState("");

  // Goal & Conditions
  const [goal, setGoal] = useState("");
  type ConditionsState = {
    highBloodPressure: boolean;
    diabetes: boolean;
  };
  const [conditions, setConditions] = useState<ConditionsState>({
    highBloodPressure: false,
    diabetes: false,
  });

  const toggleCondition = (key: keyof ConditionsState) => {
    setConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const conditionItems: {
    key: keyof ConditionsState;
    label: string;
    icon: string;
  }[] = [
    { key: "highBloodPressure", label: "Huyết áp cao", icon: "speedometer" },
    { key: "diabetes", label: "Tiểu đường (Diabetes)", icon: "cube-outline" },
  ];

  const handleSaveHealthInfo = async () => {
    if (!weight || !height || !heartRate || !sleepHours || !goal) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ chỉ số và chọn mục tiêu."
      );
      return;
    }
    setLoading(true);
    // Simulate API
    setTimeout(() => {
      setLoading(false);
      console.log({ weight, height, heartRate, sleepHours, goal, conditions });
      router.push(
        `/ActivityInfo?data=${encodeURIComponent(
          JSON.stringify({
            weight,
            height,
            heartRate,
            sleepHours,
            goal,
            conditions,
          })
        )}`
      );
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Progress */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backIcon}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <ProgressBar
                progress={0.5}
                height={6}
                color={colors.primary}
                backgroundColor="#EEF1F4"
              />
            </View>
            <Text style={styles.stepText}>2/4</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.screenTitle}>Hồ sơ sức khỏe</Text>
            <Text style={styles.screenSubtitle}>
              Giúp chúng tôi cá nhân hóa lộ trình cho bạn
            </Text>
          </View>

          {/* --- SECTION 1: METRICS GRID --- */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Chỉ số cơ thể</Text>
            <View style={styles.gridRow}>
              <MetricCard
                icon="weight-kilogram"
                label="Cân nặng"
                value={weight}
                onChangeText={setWeight}
                unit="kg"
                placeholder="0"
              />
              <View style={{ width: 12 }} />
              <MetricCard
                icon="human-male-height"
                label="Chiều cao"
                value={height}
                onChangeText={setHeight}
                unit="cm"
                placeholder="0"
              />
            </View>
            <View style={[styles.gridRow, { marginTop: 12 }]}>
              <MetricCard
                icon="heart-pulse"
                label="Nhịp tim"
                value={heartRate}
                onChangeText={setHeartRate}
                unit="bpm"
                placeholder="0"
              />
              <View style={{ width: 12 }} />
              <MetricCard
                icon="bed-clock"
                label="Giấc ngủ"
                value={sleepHours}
                onChangeText={setSleepHours}
                unit="giờ"
                placeholder="0"
              />
            </View>
          </View>

          {/* --- SECTION 2: GOALS --- */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Mục tiêu chính</Text>
            <View style={{ gap: 12 }}>
              <GoalOption
                id="lose_weight"
                icon="fire"
                label="Giảm cân"
                subLabel="Đốt cháy mỡ thừa & thon gọn"
                selected={goal === "lose_weight"}
                onSelect={setGoal}
              />
              <GoalOption
                id="maintain"
                icon="scale-balance"
                label="Duy trì vóc dáng"
                subLabel="Cải thiện sức khỏe & dẻo dai"
                selected={goal === "maintain"}
                onSelect={setGoal}
              />
              <GoalOption
                id="gain_muscle"
                icon="arm-flex"
                label="Tăng cơ bắp"
                subLabel="Xây dựng sức mạnh thể chất"
                selected={goal === "gain_muscle"}
                onSelect={setGoal}
              />
            </View>
          </View>

          {/* --- SECTION 3: MEDICAL CONDITIONS --- */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Tiền sử bệnh lý (Nếu có)</Text>
            <View style={localStyles.conditionsContainer}>
              {conditionItems.map(
                (item: {
                  key: keyof ConditionsState;
                  label: string;
                  icon: string;
                }) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      localStyles.conditionItem,
                      conditions[item.key] && localStyles.conditionItemActive,
                    ]}
                    onPress={() => toggleCondition(item.key)}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={conditions[item.key] ? colors.primary : "#888"}
                      />
                      <Text
                        style={[
                          localStyles.conditionText,
                          conditions[item.key] && {
                            color: colors.primary,
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        localStyles.checkbox,
                        conditions[item.key] && localStyles.checkboxActive,
                      ]}
                    >
                      {conditions[item.key] && (
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* --- FOOTER --- */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleSaveHealthInfo}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? "Đang xử lý..." : "Tiếp tục"}
              </Text>
              {!loading && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFF"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const localStyles = StyleSheet.create({
  // Metric Card Styles
  metricCard: {
    flex: 1,
    backgroundColor: "#F7F8FA", // Màu nền nhẹ
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    // Hiệu ứng đổ bóng nhẹ
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontWeight: "600",
  },
  metricInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  metricInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    padding: 0, // Reset padding
    height: 30,
  },
  metricUnit: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
    fontWeight: "500",
  },

  // Goal Card Styles
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#EFEFEF",
    marginBottom: 4,
  },
  goalCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "0D", // Thêm opacity 5%
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconCircleActive: {
    backgroundColor: colors.primary,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  textActive: {
    color: colors.primary,
  },
  goalSub: {
    fontSize: 12,
    color: "#888",
  },
  checkIcon: {
    marginLeft: 8,
  },

  // Conditions Styles
  conditionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    overflow: "hidden",
  },
  conditionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  conditionItemActive: {
    backgroundColor: colors.primary + "0A",
  },
  conditionText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  backIcon: {
    padding: 4,
  },
  stepText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#888",
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: typography.fontFamilyBold || "System",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  gridRow: {
    flexDirection: "row",
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    height: 56,
    borderRadius: 30, // Nút tròn hiện đại
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
