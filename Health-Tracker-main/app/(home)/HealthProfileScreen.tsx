import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Sidebar from "../../components/Sidebar";
import { colors } from "../../constants/theme";

// --- DỮ LIỆU CẤU HÌNH ---
const ACTIVITY_LEVELS = [
  {
    id: "sedentary",
    label: "Ít vận động",
    factor: 1.2,
    desc: "Văn phòng, ít đi lại",
  },
  { id: "light", label: "Nhẹ nhàng", factor: 1.375, desc: "Tập 1-3 buổi/tuần" },
  {
    id: "moderate",
    label: "Vừa phải",
    factor: 1.55,
    desc: "Tập 3-5 buổi/tuần",
  },
  {
    id: "active",
    label: "Năng động",
    factor: 1.725,
    desc: "Tập 6-7 buổi/tuần",
  },
];

const GOALS = [
  {
    id: "lose_weight",
    label: "Giảm cân",
    factor: -500,
    icon: "arrow-down-circle-outline",
  },
  {
    id: "maintain",
    label: "Giữ dáng",
    factor: 0,
    icon: "pause-circle-outline",
  },
  {
    id: "gain_muscle",
    label: "Tăng cơ",
    factor: 300,
    icon: "arrow-up-circle-outline",
  },
];
const GOALS_MAP_NUMBER: Record<number, string> = {
  1: "lose_weight",
  2: "maintain",
  3: "gain_muscle",
};
const ACTIVITY_MAP_NUMBER: Record<number, string> = {
  1: "sedentary",
  2: "light",
  3: "moderate",
  4: "active",
};

export default function HealthProfileScreen() {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- STATE DỮ LIỆU ---
  const [profile, setProfile] = useState({
    height: "",
    weight: "",
    activityId: "",
    goalId: "",
    bmi: "",
    tdee: "",
    daily_calo: "",
    conditions: {
      diabetes: false,
      bloodPressure: false,
    },
  });
  const [user, setUser] = useState({
    age: "",
    gender: "male",
  });

  const calculateAge = (dob) => {
  if (!dob) return null;

  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Nếu chưa tới sinh nhật năm nay → trừ 1
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) return;

        const res = await axios.get("http://10.0.2.2:8000/analysis/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const latest = res.data.metrics[0];
        if (!latest) return;

        setProfile({
          height: latest.height_cm.toString(),
          weight: latest.weight_kg.toString(),
          activityId: ACTIVITY_MAP_NUMBER[latest.activity_level],
          activityIdDb: ACTIVITY_MAP_NUMBER[latest.activity_level],
          goalId: GOALS_MAP_NUMBER[latest.goal],
          bmi: latest.bmi.toString(),
          daily_calo: latest.daily_calo.toString(),
          tdee: latest.tdee.toString(),
          metricId: latest.metric_id,
          conditions: {
            diabetes: latest.has_diabetes,
            bloodPressure: latest.has_hypertension,
          },
        });
      } catch (err) {
        console.error("Lỗi tải profile:", err);
      }
    };

    fetchProfile();
  }, []);

useEffect(() => { 
  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      const res = await axios.get(
        "http://10.0.2.2:8000/accounts/user_profile/",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const age = calculateAge(res.data.date_of_birth);

      setUser((prev) => ({
        ...prev,
        age: age?.toString() || prev.age,
        gender: res.data.gender || prev.gender,
        email: res.data.email || prev.email,
        username: res.data.username || prev.username
      }));

    } catch (err) {
      console.error("Lỗi get_user_profile:", err);
    }
  };

  fetchUserProfile();
}, []);

const ageToDOB = (age: string) => {
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum)) return null;

  const today = new Date();
  const birthYear = today.getFullYear() - ageNum;

  // YYYY-MM-DD (giữ ngày-tháng hiện tại)
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${birthYear}-${month}-${day}`;
};


const handleSave = async () => {
  setLoading(true);
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) throw new Error("Token không tồn tại");

    if (!profile.metricId) throw new Error("Không có metric để cập nhật");

    // ---- PAYLOAD METRIC ----
    const payload = {
      height_cm: Math.round(parseFloat(profile.height)),
      weight_kg: Math.round(parseFloat(profile.weight)),
      tdee: Math.round(stats.tdee),
      daily_calo: Math.round(stats.daily_calo),
      goal: GOALS.findIndex((g) => g.id === profile.goalId) + 1,
      activity_level:
        ACTIVITY_LEVELS.findIndex((a) => a.id === profile.activityId) + 1,
      has_hypertension: profile.conditions.bloodPressure,
      has_diabetes: profile.conditions.diabetes,
    };

    // ========================
    // 1️⃣ UPDATE METRIC
    // ========================
    const res = await axios.put(
      `http://10.0.2.2:8000/analysis/update/${profile.metricId}/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const updated = res.data.metric;

    // Cập nhật lại profile FE sau khi save Metric
    setProfile((prev) => ({
      ...prev,
      height: updated?.height_cm?.toString() || prev.height,
      weight: updated?.weight_kg?.toString() || prev.weight,
      bmi: updated?.bmi?.toString() || prev.bmi,
      tdee: updated?.tdee?.toString() || prev.tdee,
      daily_calo: updated?.daily_calo?.toString() || prev.daily_calo,
      activityId: updated?.activity_level
        ? ACTIVITY_MAP_NUMBER[updated.activity_level]
        : prev.activityId,
      goalId: updated?.goal ? GOALS_MAP_NUMBER[updated.goal] : prev.goalId,
    }));

    // ========================
    // 2️⃣ UPDATE USER PROFILE
    // ========================
    await axios.put(
      "http://10.0.2.2:8000/accounts/update_user_profile/",
      {
        dob: ageToDOB(user.age),
    gender: user.gender,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // =======================
    // DONE
    // =======================
    Alert.alert("Thành công", "Đã cập nhật hồ sơ & chỉ số!");

  } catch (err) {
    console.error("Lỗi cập nhật:", err);
    Alert.alert("Lỗi", "Cập nhật thất bại");
  } finally {
    setLoading(false);
  }
};


  const updateUser = (field: any, value: any) => {
  setUser((prev) => ({
    ...prev,
    [field]: value,
  }));
};

  const updateProfile = (key: keyof typeof profile, value: any) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCondition = (key: keyof typeof profile.conditions) => {
    setProfile((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [key]: !prev.conditions[key] },
    }));
  };
const stats = useMemo(() => {
  const goal = GOALS.find((g) => g.id === profile.goalId) || GOALS[1];

  // luôn tính BMR từ đầu, không dùng TDEE backend
  const height = parseFloat(profile.height) || 0;
  const weight = parseFloat(profile.weight) || 0;
  const age = parseInt(profile.age) || 25;
  const gender = profile.gender; // 'male' | 'female'

  let bmr = 0;
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityDb =
    ACTIVITY_LEVELS.find((l) => l.id === profile.activityIdDb) ||
    ACTIVITY_LEVELS[0];

  const activityNew =
    ACTIVITY_LEVELS.find((l) => l.id === profile.activityId) ||
    ACTIVITY_LEVELS[0];

  // tdee gốc
  const tdee = Math.round(bmr * activityNew.factor);
  const bmi = parseFloat(profile.bmi) || 0;

  let daily_calo_value = tdee;
  let daily_burn = 0;

  switch (goal.id) {
    case "lose_weight":
      const total_deficit = Math.min(Math.max(tdee * 0.2, 300), 1000);
      daily_calo_value = Math.max(bmr, tdee - total_deficit * 0.6);
      daily_burn = Math.max(200, total_deficit * 0.4);
      break;

    case "gain_muscle":
      const surplus = Math.min(Math.max(tdee * 0.15, 250), 500);
      daily_calo_value = tdee + surplus;
      daily_burn = 300;
      break;

    default:
      daily_calo_value = tdee;
      daily_burn = Math.max(200, tdee - bmr * 1.2);
      break;
  }

  const daily_calo = Math.round(daily_calo_value);

  return { bmi, tdee, daily_calo, daily_burn };
}, [profile]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowSidebar(true)}
          style={styles.menuBtn}
        >
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Sức Khỏe</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.saveText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. DASHBOARD CHỈ SỐ (QUAN TRỌNG NHẤT) */}
        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>BMI</Text>
              <Text style={[styles.previewValue, { color: "#FFF" }]}>
                {stats.bmi}
              </Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>TDEE</Text>
              <Text style={[styles.previewValue, { color: "#AAA" }]}>
                {stats.tdee}
              </Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Tiêu thụ</Text>
              <Text
                style={[
                  styles.previewValue,
                  { color: colors.primary, fontSize: 22 },
                ]}
              >
                {stats.daily_calo}
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              >
                Kcal/ngày
              </Text>
            </View>
          </View>
        </View>

        {/* 2. MỤC TIÊU (MỚI) */}
        <Text style={styles.sectionTitle}>Mục tiêu của bạn</Text>
        <View style={styles.goalContainer}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.goalBtn,
                profile.goalId === g.id && styles.goalBtnActive,
              ]}
              onPress={() => updateProfile("goalId", g.id)}
            >
              <Ionicons
                name={g.icon as any}
                size={24}
                color={profile.goalId === g.id ? colors.primary : "#888"}
              />
              <Text
                style={[
                  styles.goalText,
                  profile.goalId === g.id && styles.goalTextActive,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. CHỈ SỐ CƠ THỂ */}
        <Text style={styles.sectionTitle}>Chỉ số cơ thể</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderToggle}>
                <TouchableOpacity
                  style={[
                    styles.genderBtn,
                    user.gender === "male" && styles.genderBtnActive,
                  ]}
                  onPress={() => updateUser("gender", "male")}
                >
                  <Text
                    style={[
                      styles.genderText,
                      user.gender === "male" && styles.genderTextActive,
                    ]}
                  >
                    Nam
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderBtn,
                    user.gender === "female" && styles.genderBtnActive,
                  ]}
                  onPress={() => updateUser("gender", "female")}
                >
                  <Text
                    style={[
                      styles.genderText,
                      user.gender === "female" && styles.genderTextActive,
                    ]}
                  >
                    Nữ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tuổi</Text>
              <TextInput
                style={styles.input}
                value={user.age}
                onChangeText={(t) => updateUser("age", t)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputRow, { marginTop: 16 }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chiều cao (cm)</Text>
              <TextInput
                style={styles.input}
                value={profile.height}
                onChangeText={(t) => updateProfile("height", t)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cân nặng (kg)</Text>
              <TextInput
                style={styles.input}
                value={profile.weight}
                onChangeText={(t) => updateProfile("weight", t)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* 4. MỨC ĐỘ VẬN ĐỘNG */}
        <Text style={styles.sectionTitle}>Mức độ vận động</Text>
        {ACTIVITY_LEVELS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.listItem,
              profile.activityId === item.id && styles.listItemActive,
            ]}
            onPress={() => updateProfile("activityId", item.id)}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.listItemLabel,
                  profile.activityId === item.id && { color: colors.primary },
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.listItemDesc}>{item.desc}</Text>
            </View>
            {profile.activityId === item.id && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.primary}
              />
            )}
          </TouchableOpacity>
        ))}

        {/* 5. TIỀN SỬ BỆNH LÝ (MỚI) */}
        <Text style={styles.sectionTitle}>Tiền sử bệnh lý (Nếu có)</Text>
        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="water-percent"
                size={24}
                color="#FF6B6B"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.conditionLabel}>Tiểu đường (Diabetes)</Text>
            </View>
            <Switch
              value={profile.conditions.diabetes}
              onValueChange={() => toggleCondition("diabetes")}
              trackColor={{ false: "#EEE", true: colors.primary }}
            />
          </View>
          <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="heart-pulse"
                size={24}
                color="#FF6B6B"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.conditionLabel}>Cao huyết áp</Text>
            </View>
            <Switch
              value={profile.conditions.bloodPressure}
              onValueChange={() => toggleCondition("bloodPressure")}
              trackColor={{ false: "#EEE", true: colors.primary }}
            />
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
    </SafeAreaView>
  );
}

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
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  menuBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  saveText: { fontSize: 16, color: colors.primary, fontWeight: "bold" },

  content: { padding: 20 },

  // Preview Card
  previewCard: {
    backgroundColor: "#222",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    elevation: 5,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewItem: { alignItems: "center", flex: 1 },
  previewLabel: {
    color: "#888",
    fontSize: 10,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  previewValue: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  verticalLine: { width: 1, backgroundColor: "#444", height: "60%" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    marginLeft: 4,
    marginTop: 4,
  },

  // Goal Buttons
  goalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  goalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  goalBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  goalText: { marginTop: 8, fontSize: 13, fontWeight: "600", color: "#666" },
  goalTextActive: { color: colors.primary, fontWeight: "bold" },

  // Input Card
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 2,
  },
  inputRow: { flexDirection: "row", gap: 16 },
  inputGroup: { flex: 1 },
  label: { fontSize: 13, color: "#666", marginBottom: 8, fontWeight: "500" },
  input: {
    backgroundColor: "#F5F7FA",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    borderWidth: 1,
    borderColor: "#EEE",
  },

  genderToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    padding: 4,
  },
  genderBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  genderBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 1,
  },
  genderText: { fontSize: 14, color: "#888", fontWeight: "600" },
  genderTextActive: { color: "#333" },

  // List (Activity & Conditions)
  listContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 2,
    marginBottom: 24,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#F5F7FA",
  },
  listItemActive: { backgroundColor: "transparent" },
  listItemLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  listItemDesc: { fontSize: 12, color: "#888" },
  conditionLabel: { fontSize: 15, fontWeight: "500", color: "#333" },
});
