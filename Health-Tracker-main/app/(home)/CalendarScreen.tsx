import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Sidebar from "../../components/Sidebar";

type Activity = {
  id: string;
  title: string;
  icon: string;
  type: "meal" | "workout";
  calories: number;
  time: string;
  description?: string;
  duration?: string;
  is_completed?: boolean;
};

type DaySchedule = {
  day: string;
  date: number;
  isToday: boolean;
  recommendations: Activity[];
};

const DAILY_GOALS = { intake: 2000, burn: 500 };
const colors = {
  primary: '#4A90E2',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#888888',
  success: '#2ECC71', // Màu cho Ăn uống (Xanh lá)
  danger: '#FF6B6B',  // Màu cho Tập luyện (Đỏ cam)
  border: '#F0F0F0'
};

export default function CalendarScreen() {
  const router = useRouter();

  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchPlanTracking();
  }, []);

  const fetchPlanTracking = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(
        `http://10.0.2.2:8000/analysis/get_plan_tracking/?date=${dateStr}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();

      const planList = json.plan_tracking ?? [];

      // === Tạo 7 ngày trong tuần ===
      const startOfWeek = new Date(json.start_of_week);
      const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

      const week = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];

        // Lọc plan của ngày này
        const dailyItems = planList
          .filter((item: { date: string }) => item.date === dateStr)
          .map(
            (item: {
              tracking_id: { toString: () => any };
              item_detail: {
                name: any;
                calories: any;
                time: any;
                description: any;
                duration: any;
              };
              item_type: string;
              is_completed: any;
            }) => ({
              id: item.tracking_id.toString(),
              title: item.item_detail?.name || "Không có tiêu đề",
              icon: item.item_type === "food" ? "🍽️" : "🏋️",
              type: item.item_type === "food" ? "meal" : "workout",
              calories: item.item_detail?.calories || 0,
              time: item.item_detail?.time ?? "??:??",
              description: item.item_detail?.description ?? "",
              duration: item.item_detail?.duration ?? undefined,
              is_completed: item.is_completed,
            })
          );

        return {
          day: weekdays[i],
          date: d.getDate(),
          isToday: d.toDateString() === today.toDateString(),
          recommendations: dailyItems,
        };
      });

      setWeekSchedule(week);
      // Đồng bộ trạng thái hoàn thành theo backend
      const doneSet = new Set(
        week
          .flatMap((day) => day.recommendations)
          .filter((item) => item.is_completed)
          .map((item) => item.id)
      );
      setCompletedItems(doneSet);

      const todayIndex = week.findIndex((day) => day.isToday);
      setSelectedDayIndex(todayIndex >= 0 ? todayIndex : 0);
    } catch (err) {
      console.log("Lỗi API:", err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentDayData =
    weekSchedule[selectedDayIndex] || ({ recommendations: [] } as DaySchedule);
  const summary = useMemo(() => {
    let currentIntake = 0;
    let currentBurn = 0;
    currentDayData.recommendations.forEach((item) => {
      if (completedItems.has(item.id)) {
        if (item.type === "meal") currentIntake += item.calories;
        if (item.type === "workout") currentBurn += item.calories;
      }
    });
    return {
      intake: currentIntake,
      burn: currentBurn,
      net: currentIntake - currentBurn,
      intakeProgress: Math.min(currentIntake / DAILY_GOALS.intake, 1),
      burnProgress: Math.min(currentBurn / DAILY_GOALS.burn, 1),
    };
  }, [currentDayData, completedItems]);

  const updateTracking = async (trackingId: any, newStatus: any) => {
    const token = await AsyncStorage.getItem("auth_token");
    await fetch(
      `http://10.0.2.2:8000/analysis/put_plan_tracking/${trackingId}/`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_completed: newStatus,
        }),
      }
    );
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // 1️⃣ Update UI trước
    const newSet = new Set(completedItems);
    if (newStatus) newSet.add(id);
    else newSet.delete(id);
    setCompletedItems(newSet);

    // 2️⃣ Gọi API
    try {
      await updateTracking(id, newStatus);
    } catch (err) {
      console.error("Lỗi update tracking:", err);
      // Optionally rollback UI nếu cần
      const rollbackSet = new Set(completedItems);
      if (currentStatus) rollbackSet.add(id);
      else rollbackSet.delete(id);
      setCompletedItems(rollbackSet);
    }
  };

  const openDetail = (item: Activity) => {
    setSelectedActivity(item);
    setShowDetail(true);
  };

  // --- RENDER MỘT CARD ITEM ---
  const renderCard = (item: Activity) => {
    const isDone = completedItems.has(item.id);
    const isWorkout = item.type === "workout";
    const themeColor = isWorkout ? colors.danger : colors.success;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, isDone && styles.cardDone]}
        onPress={() => openDetail(item)}
        activeOpacity={0.8}
      >
        {/* Cột Thời gian */}
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{item.time}</Text>
          {isWorkout && (
            <Text style={styles.durationText}>{item.duration}</Text>
          )}
        </View>

        {/* Đường kẻ dọc màu */}
        <View style={[styles.vLine, { backgroundColor: themeColor }]} />

        {/* Nội dung chính */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, isDone && styles.textDone]}>
            {item.title}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={{ marginRight: 6, fontSize: 14 }}>{item.icon}</Text>
            <Text style={styles.cardSub}>
              {isWorkout ? "Đốt" : "Nạp"}{" "}
              <Text style={{ fontWeight: "bold", color: themeColor }}>
                {item.calories}
              </Text>{" "}
              Kcal
            </Text>
          </View>
        </View>

        {/* Nút Checkbox */}
        <TouchableOpacity
          onPress={() => toggleComplete(item.id)}
          style={styles.checkBox}
        >
          <Ionicons
            name={isDone ? "checkmark-circle" : "ellipse-outline"}
            size={28}
            color={isDone ? themeColor : "#DDD"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowSidebar(true)}
          style={styles.menuBtn}
        >
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Trình Hôm Nay</Text>
        <View style={styles.avatarContainer}>
          <Text style={{ fontSize: 20 }}>🧘‍♂️</Text>
        </View>
      </View>

      {/* CALENDAR STRIP (Thanh chọn ngày) */}
      <View style={styles.calendarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {weekSchedule.map((day, index) => {
            const isSelected = selectedDayIndex === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dayItem, isSelected && styles.dayItemActive]}
                onPress={() => setSelectedDayIndex(index)}
              >
                <Text
                  style={[styles.dayName, isSelected && styles.dayNameActive]}
                >
                  {day.day}
                </Text>
                <View
                  style={[
                    styles.dateBubble,
                    isSelected && styles.dateBubbleActive,
                  ]}
                >
                  <Text
                    style={[styles.dateNum, isSelected && styles.dateNumActive]}
                  >
                    {day.date}
                  </Text>
                </View>
                {day.isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SUMMARY CARD (THỰC TẾ / MỤC TIÊU - CẬP NHẬT THEO CHECKBOX) */}
        <View style={styles.summaryCard}>
          {/* Cột Nạp vào */}
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Đã Nạp (In)</Text>
            <View style={styles.valContainer}>
              <Text style={[styles.summaryVal, { color: colors.success }]}>
                {summary.intake}
              </Text>
              <Text style={styles.targetVal}> / {DAILY_GOALS.intake}</Text>
            </View>
            {/* Thanh tiến trình màu xanh */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${summary.intakeProgress * 100}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Cột Tiêu hao */}
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Đã Đốt (Out)</Text>
            <View style={styles.valContainer}>
              <Text style={[styles.summaryVal, { color: colors.danger }]}>
                {summary.burn}
              </Text>
              <Text style={styles.targetVal}> / {DAILY_GOALS.burn}</Text>
            </View>
            {/* Thanh tiến trình màu đỏ */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${summary.burnProgress * 100}%`,
                    backgroundColor: colors.danger,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Cột Net Calo */}
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Net Calo</Text>
            <Text style={[styles.summaryVal, { color: "#333" }]}>
              {summary.net}
            </Text>
            <Text style={[styles.summaryUnit, { marginTop: 4 }]}>
              {summary.net > 0 ? "Dư thừa" : "Thâm hụt"}
            </Text>
          </View>
        </View>

        {/* SECTION: DINH DƯỠNG */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Dinh Dưỡng</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeText}>
              {
                currentDayData.recommendations.filter((i) => i.type === "meal")
                  .length
              }
            </Text>
          </View>
        </View>

        {currentDayData.recommendations.filter((i) => i.type === "meal")
          .length > 0 ? (
          currentDayData.recommendations
            .filter((i) => i.type === "meal")
            .map(renderCard)
        ) : (
          <Text style={styles.emptyText}>Chưa có thực đơn cho ngày này.</Text>
        )}

        {/* SECTION: LUYỆN TẬP */}
        <View style={[styles.sectionHeaderBox, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Luyện Tập</Text>
          <View style={[styles.badgeCount, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeText}>
              {
                currentDayData.recommendations.filter(
                  (i) => i.type === "workout"
                ).length
              }
            </Text>
          </View>
        </View>

        {currentDayData.recommendations.filter((i) => i.type === "workout")
          .length > 0 ? (
          currentDayData.recommendations
            .filter((i) => i.type === "workout")
            .map(renderCard)
        ) : (
          <Text style={styles.emptyText}>Hôm nay là ngày nghỉ ngơi.</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* SIDEBAR */}
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      {/* MODAL CHI TIẾT */}
      <Modal
        visible={showDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết hoạt động</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedActivity && (
              <>
                <View style={{ alignItems: "center", marginVertical: 20 }}>
                  <View
                    style={[
                      styles.bigIconCircle,
                      {
                        backgroundColor:
                          selectedActivity.type === "workout"
                            ? "#FFF0F0"
                            : "#E8F5E9",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 40 }}>
                      {selectedActivity.icon}
                    </Text>
                  </View>
                  <Text style={styles.modalActivityTitle}>
                    {selectedActivity.title}
                  </Text>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor:
                          selectedActivity.type === "workout"
                            ? "#FFF0F0"
                            : "#E8F5E9",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          selectedActivity.type === "workout"
                            ? colors.danger
                            : colors.success,
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {selectedActivity.type === "workout"
                        ? "LUYỆN TẬP"
                        : "DINH DƯỠNG"}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian:</Text>
                  <Text style={styles.detailVal}>{selectedActivity.time}</Text>
                </View>
                {selectedActivity.duration && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời lượng:</Text>
                    <Text style={styles.detailVal}>
                      {selectedActivity.duration}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Calo dự kiến:</Text>
                  <Text style={styles.detailVal}>
                    {selectedActivity.calories} Kcal
                  </Text>
                </View>
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.detailLabel}>Ghi chú:</Text>
                  <Text
                    style={[
                      styles.detailVal,
                      { flex: 1, textAlign: "right", fontWeight: "400" },
                    ]}
                  >
                    {selectedActivity.description}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    completedItems.has(selectedActivity.id) &&
                      styles.modalBtnOutline,
                  ]}
                  onPress={() => {
                    toggleComplete(
                      selectedActivity.id,
                      completedItems.has(selectedActivity.id)
                    );
                    setShowDetail(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalBtnText,
                      completedItems.has(selectedActivity.id) && {
                        color: colors.primary,
                      },
                    ]}
                  >
                    {completedItems.has(selectedActivity.id)
                      ? "Đánh dấu chưa xong"
                      : "Đánh dấu hoàn thành"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
    backgroundColor: colors.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },
  menuBtn: { padding: 4 },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },

  // Calendar Strip
  calendarContainer: {
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayItem: { alignItems: "center", marginRight: 16, width: 50 },
  dayItemActive: {},
  dayName: { fontSize: 13, color: colors.textLight, marginBottom: 6 },
  dayNameActive: { color: colors.primary, fontWeight: "bold" },
  dateBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBubbleActive: { backgroundColor: colors.primary },
  dateNum: { fontSize: 16, fontWeight: "600", color: colors.text },
  dateNumActive: { color: colors.white },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },

  content: { padding: 20 },

  // Summary Card
  summaryCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "space-between",
  },
  summaryCol: { alignItems: "center", flex: 1 },
  summaryLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 6,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  valContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  summaryVal: { fontSize: 18, fontWeight: "bold" },
  targetVal: { fontSize: 12, color: "#999", fontWeight: "500" },
  summaryUnit: { fontSize: 10, color: "#999" },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    height: "70%",
    alignSelf: "center",
  },

  progressBarBg: {
    width: "80%",
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 2 },

  // Section
  sectionHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginRight: 8,
  },
  badgeCount: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  emptyText: {
    color: colors.textLight,
    fontStyle: "italic",
    marginBottom: 10,
    marginLeft: 4,
  },

  // Card Item
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  cardDone: { opacity: 0.6, backgroundColor: "#FAFAFA" },

  timeCol: { width: 50, alignItems: "center", marginRight: 10 },
  timeText: { fontSize: 14, fontWeight: "bold", color: colors.text },
  durationText: { fontSize: 10, color: colors.textLight, marginTop: 2 },

  vLine: { width: 3, height: "80%", borderRadius: 2, marginRight: 12 },

  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  textDone: { textDecorationLine: "line-through", color: colors.textLight },
  cardMeta: { flexDirection: "row", alignItems: "center" },
  cardSub: { fontSize: 12, color: colors.textLight },

  checkBox: { padding: 4 },

  // Modal Detail
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },

  bigIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalActivityTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: colors.text,
  },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: { color: colors.textLight, fontSize: 15 },
  detailVal: { color: colors.text, fontSize: 15, fontWeight: "600" },

  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  modalBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalBtnText: { color: colors.white, fontWeight: "bold", fontSize: 16 },
});
