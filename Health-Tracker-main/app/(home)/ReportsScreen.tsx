import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import Sidebar from "../../components/Sidebar";
import { colors } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 60;
const CHART_HEIGHT = 180;

// Dữ liệu mẫu (Chuẩn hóa)
const WEEKLY_DATA = {
  weight: [75, 74.8, 74.5, 74.2, 73.9, 73.5, 73.2],
  labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  steps: [6000, 8500, 10200, 7800, 9500, 12000, 11500],
};

const MONTHLY_DATA = {
  weight: [78, 77, 76.5, 75.8, 75, 74.2, 73.5], // Đại diện 4 tuần
  labels: ["W1", "W2", "W3", "W4"],
  steps: [180000, 210000, 250000, 230000], // Tổng bước tuần
};

export default function ReportsScreen() {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedTab, setSelectedTab] = useState("week");

  // Chọn dữ liệu theo Tab
  const data = selectedTab === "week" ? WEEKLY_DATA : MONTHLY_DATA; // Logic đơn giản hóa cho demo

  // --- HELPER VẼ BIỂU ĐỒ ĐƯỜNG (WEIGHT) ---
  const renderLineChart = () => {
    const values = data.weight;
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const range = max - min;

    // Tạo đường dẫn (Path)
    const points = values
      .map((val, index) => {
        const x = (index / (values.length - 1)) * CHART_WIDTH;
        const y = CHART_HEIGHT - ((val - min) / range) * CHART_HEIGHT;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Cân nặng</Text>
            <Text style={styles.chartSub}>
              {selectedTab === "week" ? "📉 Giảm 1.8kg" : "📉 Giảm 4.5kg"}
              <Text style={{ color: "#999", fontWeight: "400" }}>
                {" "}
                (so với đầu kỳ)
              </Text>
            </Text>
          </View>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Thực tế</Text>
          </View>
        </View>

        <Svg width={CHART_WIDTH + 20} height={CHART_HEIGHT + 40}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid Lines Ngang */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <Line
              key={i}
              x1="0"
              y1={t * CHART_HEIGHT}
              x2={CHART_WIDTH}
              y2={t * CHART_HEIGHT}
              stroke="#F0F0F0"
              strokeWidth="1"
            />
          ))}

          {/* Vùng màu Gradient dưới đường */}
          <Path
            d={`M0,${CHART_HEIGHT} ${values
              .map(
                (v, i) =>
                  `L${(i / (values.length - 1)) * CHART_WIDTH},${
                    CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT
                  }`
              )
              .join(" ")} L${CHART_WIDTH},${CHART_HEIGHT} Z`}
            fill="url(#grad)"
          />

          {/* Đường kẻ chính */}
          <Path
            d={`M${values
              .map(
                (v, i) =>
                  `${(i / (values.length - 1)) * CHART_WIDTH},${
                    CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT
                  }`
              )
              .join(" L")}`}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
          />

          {/* Các điểm tròn */}
          {values.map((v, i) => (
            <Circle
              key={i}
              cx={(i / (values.length - 1)) * CHART_WIDTH}
              cy={CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT}
              r="4"
              fill="white"
              stroke={colors.primary}
              strokeWidth="2"
            />
          ))}

          {/* Nhãn trục X */}
          {data.labels.slice(0, values.length).map((label, i) => (
            <SvgText
              key={i}
              x={(i / (values.length - 1)) * CHART_WIDTH}
              y={CHART_HEIGHT + 25}
              fontSize="10"
              fill="#888"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}
        </Svg>

        {/* Fake X-Axis Labels (Dùng View RN cho dễ căn chỉnh nếu SVG Text lỗi font) */}
        <View style={styles.xAxis}>
          {data.labels.slice(0, values.length).map((l, i) => (
            <Text key={i} style={styles.xAxisLabel}>
              {l}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // --- HELPER VẼ BIỂU ĐỒ CỘT (STEPS) ---
  const renderBarChart = () => {
    const values = data.steps;
    const max = Math.max(...values) * 1.1; // Thêm 10% đỉnh

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Hoạt động (Bước chân)</Text>
            <Text style={styles.chartSub}>
              Trung bình:{" "}
              <Text style={{ color: "#333", fontWeight: "bold" }}>9,500</Text>{" "}
              bước/ngày
            </Text>
          </View>
        </View>

        <View
          style={{
            height: 180,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          {values.map((val, index) => {
            const height = (val / max) * 150;
            return (
              <View key={index} style={{ alignItems: "center", flex: 1 }}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: height,
                      backgroundColor: val > 10000 ? "#2ECC71" : "#FF6B6B",
                    },
                  ]}
                />
                <Text style={styles.xAxisLabel}>{data.labels[index]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Báo Cáo Tiến Độ</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              selectedTab === "week" && styles.tabBtnActive,
            ]}
            onPress={() => setSelectedTab("week")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "week" && styles.tabTextActive,
              ]}
            >
              Tuần này
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              selectedTab === "month" && styles.tabBtnActive,
            ]}
            onPress={() => setSelectedTab("month")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "month" && styles.tabTextActive,
              ]}
            >
              Tháng này
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARDS ROW */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
            <Ionicons name="trending-down" size={24} color="#2196F3" />
            <Text style={styles.statVal}>-2.3 kg</Text>
            <Text style={styles.statLabel}>Thay đổi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="flame" size={24} color="#4CAF50" />
            <Text style={styles.statVal}>12.5k</Text>
            <Text style={styles.statLabel}>Calo đốt</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.statVal}>5.4h</Text>
            <Text style={styles.statLabel}>Thời gian tập</Text>
          </View>
        </View>

        {/* CHARTS */}
        {renderLineChart()}

        {renderBarChart()}

        <View style={{ height: 50 }} />
      </ScrollView>

      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  menuBtn: { padding: 4 },

  content: { padding: 20 },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: { fontWeight: "600", color: "#888" },
  tabTextActive: { color: "#FFF" },

  // Summary Grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "31%",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statVal: { fontSize: 16, fontWeight: "bold", marginTop: 8, color: "#333" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },

  // Chart Container
  chartContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  chartTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  chartSub: { fontSize: 12, color: "#2ECC71", fontWeight: "600", marginTop: 2 },
  legend: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: "#666" },

  // Axis
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  xAxisLabel: { fontSize: 10, color: "#999", marginTop: 8 },

  // Bar Chart
  bar: { width: 12, borderRadius: 6 },
});
