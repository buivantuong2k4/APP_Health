import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
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

// --- THEME COLORS ---
const colors = {
  primary: "#4A90E2",
  background: "#F8F9FA",
  white: "#FFFFFF",
  text: "#333333",
  textLight: "#888888",
  border: "#F0F0F0",
  inputBg: "#F5F7FA",
};

export default function UserProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    fullname: "",
    email: "",
    phone: "",
    gender: "", // 'male' | 'female' | 'other'
    dob: new Date(),
  });

  const fetchUserProfile = async () => {
    const token = await AsyncStorage.getItem("auth_token");

    const res = await fetch("http://10.0.2.2:8000/accounts/user_profile/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setProfile((prev) => ({
      ...prev,
      fullname: data.full_name ?? prev.fullname,
      email: data.email ?? prev.email,
      phone: data.phone ?? prev.phone,
      gender: data.gender ?? prev.gender,
      dob: data.date_of_birth ? new Date(data.date_of_birth) : prev.dob,
    }));
    console.log(data);
  };
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const updateProfile = async (profileData: any) => {
    const token = await AsyncStorage.getItem("auth_token");
    const res = await fetch(
      "http://10.0.2.2:8000/accounts/update_user_profile/",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      }
    );

    const data = await res.json();
    console.log(data);
    return data;
  };

  // State cho DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- ACTIONS ---
  const handleSave = async () => {
    try {
      setLoading(true);

      // Gọi API PUT thực tế
      const updatedData = await updateProfile({
        full_name: profile.fullname,
        phone: profile.phone,
        gender: profile.gender,
        dob: profile.dob.toISOString().split("T")[0], // chuyển Date thành "YYYY-MM-DD"
      });

      // Cập nhật state UI với dữ liệu mới từ server
      setProfile((prev) => ({
        ...prev,
        full_name: updatedData.user.full_name,
        phone: updatedData.user.phone,
        gender: updatedData.user.gender,
        dob: new Date(updatedData.user.dob),
      }));

      Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật!");
    } catch (err) {
      console.log("Lỗi cập nhật profile:", err);
      Alert.alert("Lỗi", "Không thể cập nhật thông tin. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const [avatar, setAvatar] = useState(null);

  const handleChangeAvatar = () => {
    Alert.alert("Thay ảnh đại diện", "Chọn ảnh từ thư viện hoặc chụp ảnh mới", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thư viện",
        onPress: pickImageFromLibrary,
      },
      {
        text: "Chụp ảnh",
        onPress: takePhotoWithCamera,
      },
    ]);
  };

  // 📌 Chọn ảnh từ thư viện
  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Quyền bị từ chối",
        "Vui lòng cấp quyền truy cập thư viện ảnh"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  // 📸 Chụp ảnh bằng camera
  const takePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền bị từ chối", "Vui lòng cấp quyền sử dụng camera");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      setProfile({ ...profile, dob: selectedDate });
    }
  };

  // Helper format ngày
  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={styles.saveBtn}
        >
          <Text style={styles.saveText}>{loading ? "Lưu..." : "Lưu"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. AVATAR SECTION */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatarImage}
              />
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handleChangeAvatar}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.roleText}>Thành viên Free</Text>
          </View>

          {/* 2. FORM INFO */}
          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                value={profile.fullname}
                onChangeText={(t) => setProfile({ ...profile, fullname: t })}
                placeholder="Nhập họ tên"
              />
            </View>

            {/* Email (Read Only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Không thể sửa)</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={{ color: "#999" }}>{profile.email}</Text>
                <Ionicons name="lock-closed" size={16} color="#CCC" />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                value={profile.phone}
                onChangeText={(t) => setProfile({ ...profile, phone: t })}
                keyboardType="phone-pad"
                placeholder="Nhập SĐT"
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ngày sinh</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: colors.text }}>
                  {formatDate(profile.dob)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={profile.dob}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}
              {/* Nút Done cho iOS */}
              {showDatePicker && Platform.OS === "ios" && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    style={styles.iosDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Xong
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderContainer}>
                {["male", "female", "other"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      profile.gender === g && styles.genderBtnActive,
                    ]}
                    onPress={() => setProfile({ ...profile, gender: g })}
                  >
                    <Ionicons
                      name={
                        g === "male"
                          ? "male"
                          : g === "female"
                          ? "female"
                          : "male-female"
                      }
                      size={18}
                      color={profile.gender === g ? colors.primary : "#888"}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        profile.gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },
  iconBtn: { padding: 4 },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + "15",
    borderRadius: 20,
  },
  saveText: { color: colors.primary, fontWeight: "bold", fontSize: 14 },

  content: { padding: 20 },

  // Avatar
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.white,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  roleText: { color: colors.textLight, fontSize: 14, fontWeight: "500" },

  // Form Card
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputDisabled: { backgroundColor: "#F0F0F0", opacity: 0.8 },

  // Gender
  genderContainer: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  genderBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  genderText: { marginLeft: 6, fontWeight: "600", color: colors.textLight },
  genderTextActive: { color: colors.primary },

  iosDoneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
