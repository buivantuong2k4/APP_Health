import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type PlanTrackingSummary = {
  days: number;
  active_days: number;
  avg_net: number;
  avg_food: number;
  avg_exercise: number;
};

type PlanTrackingReport = {
  range: string;
  labels: string[];
  net: number[];
  food: number[];
  exercise: number[];
  summary?: PlanTrackingSummary;
};

export default function ReportsScreen() {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);

  const [labels, setLabels] = useState<string[]>([]);
  const [netValues, setNetValues] = useState<number[]>([]);
  const [foodValues, setFoodValues] = useState<number[]>([]);
  const [exerciseValues, setExerciseValues] = useState<number[]>([]);
  const [summary, setSummary] = useState<PlanTrackingSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ============================
  // Fetch báo cáo từ PlanTracking
  // ============================
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          setErrorMsg("Không tìm thấy token. Vui lòng đăng nhập lại.");
          return;
        }

        // URL trùng với API bạn đã viết ở backend
        const res = await axios.get<PlanTrackingReport>(
          "http://10.0.2.2:8000/analysis/plan_tracking_report/",
          {
            headers: { Authorization: `Bearer ${token}` },
            // params: { range: "7d" }, // nếu phía backend support
          }
        );

        const data = res.data;

        setLabels(data.labels || []);
        setNetValues((data.net || []).map((v) => Number(v)));
        setFoodValues((data.food || []).map((v) => Number(v)));
        setExerciseValues((data.exercise || []).map((v) => Number(v)));
        setSummary(data.summary || null);
      } catch (err) {
        console.error("Lỗi tải báo cáo từ PlanTracking:", err);
        setErrorMsg("Không tải được dữ liệu báo cáo.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  // ============================
  // Biểu đồ đường: NET calories theo ngày
  // ============================
  const renderNetChart = () => {
    const values = netValues;

    if (!values || values.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Calo NET mỗi ngày</Text>
          <Text style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
            Chưa có đủ dữ liệu để vẽ biểu đồ. Hãy hoàn thành một số kế hoạch ăn
            / tập trong PlanTracking.
          </Text>
        </View>
      );
    }

    // Giá trị min/max & padding cho đồ thị
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.1, 50); // thêm biên trên/dưới
    const chartMin = min - padding;
    const chartMax = max + padding;
    const range = Math.max(chartMax - chartMin, 1);

    const count = values.length;

    const getX = (index: number) =>
      count > 1 ? (index / (count - 1)) * CHART_WIDTH : CHART_WIDTH / 2;

    const getY = (value: number) =>
      CHART_HEIGHT - ((value - chartMin) / range) * CHART_HEIGHT;

    const avgNet = summary?.avg_net ?? 0;

    const netSummaryText =
      values.length === 0
        ? "Chưa có dữ liệu"
        : avgNet > 0
        ? `📈 Thặng dư trung bình +${Math.round(
            avgNet
          )} kcal/ngày (xu hướng tăng cân)`
        : avgNet < 0
        ? `📉 Thâm hụt trung bình ${Math.round(
            avgNet
          )} kcal/ngày (xu hướng giảm cân)`
        : "⚖ Net trung bình ~ 0 kcal (giữ cân)";

    return (
      <View style={styles.chartContainer}>
        <View className="header" style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Calo NET mỗi ngày</Text>
            <Text style={styles.chartSub}>{netSummaryText}</Text>
            {summary && (
              <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                Số ngày có log: {summary.active_days}/{summary.days}
              </Text>
            )}
          </View>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>NET = Ăn - Đốt</Text>
          </View>
        </View>

        <Svg width={CHART_WIDTH + 20} height={CHART_HEIGHT + 40}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid ngang */}
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

          {/* Trục net = 0 (đường ngang nếu 0 nằm trong khoảng) */}
          {chartMin < 0 && chartMax > 0 && (
            <Line
              x1="0"
              x2={CHART_WIDTH}
              y1={getY(0)}
              y2={getY(0)}
              stroke="#FF9800"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}

          {/* Vùng gradient dưới đường */}
          <Path
            d={`M0,${CHART_HEIGHT} ${values
              .map((v, i) => `L${getX(i)},${getY(v)}`)
              .join(" ")} L${CHART_WIDTH},${CHART_HEIGHT} Z`}
            fill="url(#grad)"
          />

          {/* Đường chính */}
          <Path
            d={`M${values.map((v, i) => `${getX(i)},${getY(v)}`).join(" L")}`}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
          />

          {/* Các điểm tròn */}
          {values.map((v, i) => (
            <Circle
              key={i}
              cx={getX(i)}
              cy={getY(v)}
              r="4"
              fill="white"
              stroke={colors.primary}
              strokeWidth="2"
            />
          ))}

          {/* Nhãn trục X */}
          {labels.map((label, i) => (
            <SvgText
              key={i}
              x={getX(i)}
              y={CHART_HEIGHT + 25}
              fontSize="10"
              fill="#888"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}
        </Svg>

        <View style={styles.xAxis}>
          {labels.map((l, i) => (
            <Text key={i} style={styles.xAxisLabel}>
              {l}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // ============================
  // Hiển thị summary card
  // ============================
  const avgNetDisplay =
    summary && summary.active_days > 0
      ? `${summary.avg_net > 0 ? "+" : ""}${summary.avg_net} kcal`
      : "--";

  const avgFoodDisplay =
    summary && summary.active_days > 0 ? `${summary.avg_food} kcal` : "--";

  const avgExerciseDisplay =
    summary && summary.active_days > 0
      ? `${summary.avg_exercise} kcal`
      : "--";

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
        {loading && netValues.length === 0 ? (
          <View
            style={{
              paddingVertical: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
              Đang tải dữ liệu báo cáo...
            </Text>
          </View>
        ) : null}

        {errorMsg && netValues.length === 0 ? (
          <Text style={{ color: "red", marginBottom: 16 }}>{errorMsg}</Text>
        ) : null}

        {/* SUMMARY CARDS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
            <Ionicons name="speedometer" size={24} color="#2196F3" />
            <Text style={styles.statVal}>{avgNetDisplay}</Text>
            <Text style={styles.statLabel}>NET trung bình</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="restaurant" size={24} color="#4CAF50" />
            <Text style={styles.statVal}>{avgFoodDisplay}</Text>
            <Text style={styles.statLabel}>Calo ăn trung bình</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
            <Ionicons name="flame" size={24} color="#FF9800" />
            <Text style={styles.statVal}>{avgExerciseDisplay}</Text>
            <Text style={styles.statLabel}>Calo đốt trung bình</Text>
          </View>
        </View>

        {/* 1 BIỂU ĐỒ DUY NHẤT: NET CALORIES */}
        {renderNetChart()}

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
});
