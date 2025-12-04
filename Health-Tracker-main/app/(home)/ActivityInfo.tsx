import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProgressBar } from "../../components/ProgressBar";
import { colors } from "../../constants/theme";

// --- Dữ liệu Activity Levels ---
const ACTIVITY_LEVELS = [
  {
    id: "sedentary",
    title: "Ít vận động (Sedentary)",
    subtitle: "Làm việc văn phòng, ít hoặc không tập thể dục.",
    icon: "chair-rolling",
    factor: 1.2,
  },
  {
    id: "light",
    title: "Vận động nhẹ (Light)",
    subtitle: "Tập thể dục nhẹ nhàng 1-3 ngày/tuần.",
    icon: "walk",
    factor: 1.375,
  },
  {
    id: "moderate",
    title: "Vận động vừa (Moderate)",
    subtitle: "Tập cường độ trung bình 3-5 ngày/tuần.",
    icon: "run",
    factor: 1.55,
  },
  {
    id: "active",
    title: "Năng động (Very Active)",
    subtitle: "Tập cường độ cao 6-7 ngày/tuần hoặc lao động nặng.",
    icon: "weight-lifter",
    factor: 1.725,
  },
];

export default function ActivityLevelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCompleteProfile = async () => {
    setLoading(true);

    try {
      const previousHealthData = params.data
        ? JSON.parse(decodeURIComponent(params.data as string))
        : {};

      const finalPayload = {
        height_cm: Number(previousHealthData.height),
        weight_kg: Number(previousHealthData.weight),
        heart_rate: Number(previousHealthData.heartRate ?? 0),
        sleep_hours: Number(previousHealthData.sleepHours ?? 0),
        goal: previousHealthData.goal ?? "",
        has_diabetes: previousHealthData.conditions?.diabetes ?? false,
        has_hypertension:
          previousHealthData.conditions?.highBloodPressure ?? false,
        activity_level: selectedId,
        blood_pressure_systolic:
          previousHealthData.bloodPressureSystolic ?? 120,
        blood_pressure_diastolic:
          previousHealthData.bloodPressureDiastolic ?? 80,
      };

      // const token = await AsyncStorage.getItem("auth_token");
      const rawToken = await AsyncStorage.getItem("auth_token");
      const token = rawToken?.trim(); // loại bỏ khoảng trắng đầu cuối
      console.log("Token length:", token?.length);
      console.log("Token sent:", token);
      console.log("analys sended:", finalPayload);
      // console.log(token)
      if (!token) throw new Error("Token không tồn tại");

      const response = await axios.post(
       "http://10.0.2.2:8000/analysis/add_metric/",
        finalPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token?.trim()}`,
          },
        }
      );
      console.log("API RESPONSE:", response.data);
      
    router.push("/(home)/DashboardScreen");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Lỗi",
        // eslint-disable-next-line import/no-named-as-default-member
        axios.isAxiosError(error)
          ? error.response?.data?.error || "Gửi dữ liệu thất bại"
          : "Đã có lỗi xảy ra khi lưu hồ sơ."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- HEADER --- */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backIcon}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <ProgressBar
              progress={1.0}
              height={6}
              color={colors.primary}
              backgroundColor="#EEF1F4"
            />
          </View>
          <Text style={styles.stepText}>3/3</Text>
        </View>

        {/* --- TITLE --- */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Mức độ vận động</Text>
          <Text style={styles.screenSubtitle}>
            Chúng tôi dùng thông tin này để tính toán lượng Calo tiêu thụ hàng
            ngày (TDEE) của bạn.
          </Text>
        </View>

        {/* --- LIST --- */}
        <View style={styles.listContainer}>
          {ACTIVITY_LEVELS.map((item) => {
            const isActive = selectedId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[localStyles.card, isActive && localStyles.cardActive]}
                activeOpacity={0.9}
                onPress={() => setSelectedId(item.id)}
              >
                <View
                  style={[
                    localStyles.iconBox,
                    isActive && localStyles.iconBoxActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={28}
                    color={isActive ? "#FFF" : "#888"}
                  />
                </View>
                <View style={localStyles.contentBox}>
                  <Text
                    style={[
                      localStyles.cardTitle,
                      isActive && { color: colors.primary },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={localStyles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={localStyles.radioBox}>
                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  ) : (
                    <View style={localStyles.radioUnchecked} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --- FOOTER --- */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.btnPrimary,
              (!selectedId || loading) && styles.btnDisabled,
            ]}
            onPress={handleCompleteProfile}
            disabled={!selectedId || loading}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? "Đang xử lý..." : "Hoàn tất hồ sơ"}
            </Text>
            {!loading && (
              <Ionicons
                name="checkmark"
                size={20}
                color="#FFF"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const localStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconBoxActive: { backgroundColor: colors.primary },
  contentBox: { flex: 1, paddingRight: 8 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 13, color: "#666", lineHeight: 18 },
  radioBox: { justifyContent: "center", alignItems: "center" },
  radioUnchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  scrollContent: { paddingBottom: 40 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  backIcon: { padding: 4 },
  stepText: { fontSize: 14, fontWeight: "bold", color: "#888" },
  titleSection: { paddingHorizontal: 20, marginBottom: 24 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  screenSubtitle: { fontSize: 15, color: "#666", lineHeight: 22 },
  listContainer: { paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, marginTop: 20 },
  btnPrimary: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { backgroundColor: "#E0E0E0", shadowOpacity: 0, elevation: 0 },
  btnPrimaryText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
