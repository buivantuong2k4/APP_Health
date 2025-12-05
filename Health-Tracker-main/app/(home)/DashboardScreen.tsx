import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg"; // Cần cài: npx expo install react-native-svg
import Sidebar from "../../components/Sidebar";
import { colors } from "../../constants/theme"; // Giả định file theme

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = 180;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DashboardScreen() {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);

  // Dữ liệu health lấy từ API
  const [healthData, setHealthData] = useState<null | {
    bmi: number;
    weight: number;
    height: number;
    tdee: number;
    caloriesBurned: number;
    caloriesEaten: number;
    caloriesGoal: number;
    caloriesBurn: number;

  }>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Lấy token đã lưu khi login
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          console.warn(
            "Không tìm thấy token, chuyển về màn hình đăng nhập nếu cần."
          );
          return;
        }

        // 2. Gọi đúng API Django: get_analysis_by_user
        // Backend trả: { user: string, today: string, metrics: [...] }
        const res = await axios.get(`${API_BASE_URL}/analysis/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const metrics = res.data?.metrics || [];
        const latest = metrics[0]; // bản ghi mới nhất (đã order -updated_at ở backend)

        if (!latest) {
          console.warn("Không có health metrics cho user này.");
          return;
        }

        // 3. Map dữ liệu từ API sang state dùng cho UI
        setHealthData({
          bmi: latest.bmi,
          weight: latest.weight_kg,
          height: latest.height_cm,
          tdee: latest.tdee,

          // 🔥 dùng CALO THỰC TẾ trong ngày (tính từ PlanTracking)
          caloriesBurned: latest.actual_calo_burned_today ?? 0,
          caloriesEaten: latest.actual_calo_eaten_today ?? 0,

          // mục tiêu calo: lấy từ daily_calo (goal)
          caloriesGoal: latest.daily_calo || 2000,
          caloriesBurn: latest.daily_burn || 500,
        });
      } catch (err: any) {
        console.error(
          "Lỗi tải Dashboard:",
          err.response?.data || err.message || err
        );
      }
    };

    fetchDashboardData();
  }, []);

  // ⚠️ Chặn render khi healthData chưa load xong
  if (!healthData) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text>Đang tải dữ liệu...</Text>
      </SafeAreaView>
    );
  }

 // --- NET CALORIES DASHBOARD LOGIC ---

// Net calories = Đã ăn - Đã đốt
const netCalories = healthData.caloriesEaten - healthData.caloriesBurned;
const GoalCalories = healthData.caloriesGoal - healthData.caloriesBurn;

// Còn lại = mục tiêu - net
const caloriesRemaining = GoalCalories - netCalories;


// Tiến độ vòng tròn (0 → 1)
const progress = Math.max(
  0,
  Math.min(netCalories / (GoalCalories|| 1), 1)
);

// Stroke vòng tròn
const strokeDashoffset = CIRCUMFERENCE * (1 - progress);


  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: "Thiếu cân", color: "#F39C12" };
    if (bmi < 24.9) return { label: "Bình thường", color: "#2ECC71" };
    if (bmi < 29.9) return { label: "Thừa cân", color: "#E67E22" };
    return { label: "Béo phì", color: "#E74C3C" };
  };

  const bmiStatus = getBMIStatus(healthData.bmi);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowSidebar(true)}
          style={styles.menuBtn}
        >
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Tổng quan sức khỏe</Text>
          <Text style={styles.headerDate}>
            Hôm nay, {new Date().toLocaleDateString("vi-VN")}
          </Text>
        </View>
        <ImagePlaceholder />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. CALORIE RING CHART (Trung tâm) */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Calo trong ngày</Text>

          <View style={styles.chartContainer}>
            {/* SVG Chart */}
            <View
              style={{
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                {/* Vòng tròn nền */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  stroke="#F0F0F0"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                {/* Vòng tròn tiến độ */}
                <G
                  rotation="-90"
                  origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                >
                  <Circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    stroke={colors.primary || "#4A90E2"}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </G>
              </Svg>

              {/* Text ở giữa vòng tròn */}
              <View style={styles.chartTextContainer}>
                <Text style={styles.headerTitle}>
                  {Math.round(caloriesRemaining)}/ {Math.round(GoalCalories)}
                </Text>
                <Text style={styles.chartLabel}>Còn lại</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>IN|OUT</Text>
              <Text style={styles.statVal}>{healthData.caloriesGoal}|{healthData.caloriesBurn}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Đã ăn</Text>
              <Text
                style={[styles.statVal, { color: colors.primary || "#4A90E2" }]}
              >
                {healthData.caloriesEaten}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Đã đốt</Text>
              <Text style={[styles.statVal, { color: "#FF6B6B" }]}>
                {healthData.caloriesBurned}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. BODY METRICS GRID */}
        <Text style={styles.sectionTitle}>Chỉ số cơ thể</Text>
        <View style={styles.gridContainer}>
          {/* BMI Card */}
          <View style={styles.metricCard}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: bmiStatus.color + "20" },
              ]}
            >
              <MaterialCommunityIcons
                name="scale-bathroom"
                size={24}
                color={bmiStatus.color}
              />
            </View>
            <Text style={styles.metricLabel}>BMI</Text>
            <Text style={[styles.metricValue, { color: bmiStatus.color }]}>
              {healthData.bmi}
            </Text>
            <Text style={[styles.metricStatus, { color: bmiStatus.color }]}>
              {bmiStatus.label}
            </Text>
          </View>

          {/* TDEE Card */}
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: "#E8F5E9" }]}>
              <MaterialCommunityIcons name="fire" size={24} color="#2ECC71" />
            </View>
            <Text style={styles.metricLabel}>TDEE (Tiêu thụ)</Text>
            <Text style={styles.metricValue}>{healthData.tdee}</Text>
            <Text style={styles.metricStatus}>Kcal/ngày</Text>
          </View>

          {/* Weight Card */}
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: "#E3F2FD" }]}>
              <MaterialCommunityIcons name="weight" size={24} color="#2196F3" />
            </View>
            <Text style={styles.metricLabel}>Cân nặng</Text>
            <Text style={styles.metricValue}>{healthData.weight}</Text>
            <Text style={styles.metricStatus}>kg</Text>
          </View>

          {/* Height Card */}
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: "#FFF3E0" }]}>
              <MaterialCommunityIcons
                name="human-male-height"
                size={24}
                color="#FF9800"
              />
            </View>
            <Text style={styles.metricLabel}>Chiều cao</Text>
            <Text style={styles.metricValue}>{healthData.height}</Text>
            <Text style={styles.metricStatus}>cm</Text>
          </View>
        </View>

        {/* 3. CALL TO ACTION BUTTON */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push("/(home)/CalendarScreen")}
        >
          <Text style={styles.actionBtnText}>Xem lịch trình & Bữa ăn</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
    </SafeAreaView>
  );
}

// Placeholder cho Avatar
const ImagePlaceholder = () => (
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#EEE",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Text>👤</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFF",
  },
  menuBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  headerDate: { fontSize: 13, color: "#888" },

  content: { padding: 20 },

  // Chart Card Style
  chartCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    alignSelf: "flex-start",
    marginBottom: 20,
  },

  chartContainer: { marginBottom: 24 },
  chartTextContainer: { position: "absolute", alignItems: "center" },
  chartBigNumber: { fontSize: 36, fontWeight: "bold", color: "#333" },
  chartLabel: { fontSize: 14, color: "#888" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  statVal: { fontSize: 18, fontWeight: "bold", color: "#333" },

  // Grid Style
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  metricCard: {
    width: (width - 40 - 12) / 2, // 2 cột
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  metricLabel: { fontSize: 13, color: "#888", marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: "bold", color: "#333" },
  metricStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginTop: 2,
  },

  // Action Button
  actionBtn: {
    marginTop: 24,
    backgroundColor: colors.primary || "#4A90E2",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary || "#4A90E2",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    marginRight: 8,
  },
});
