import DateTimePicker from "@react-native-community/datetimepicker"; // Import thư viện lịch
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Alert,
  Platform, // Cần import để xử lý UI khác nhau giữa iOS/Android
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LoginInput from "../../components/LoginInput";
import PrimaryButton from "../../components/PrimaryButton";
import { authScreenStyles as styles } from "../../constants/authScreenStyles";
import { colors, typography } from "../../constants/theme";

export default function RegisterScreen() {
  const router = useRouter();

  // State form
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");

  // State cho Date Picker
  const [dateOfBirth, setDateOfBirth] = useState(new Date()); // Lưu object Date để xử lý logic
  const [showDatePicker, setShowDatePicker] = useState(false); // Ẩn/hiện lịch
  const [dobText, setDobText] = useState(""); // Lưu string để hiển thị lên Input (VD: "20/11/1995")

  const [loading, setLoading] = useState(false);

  // Hàm xử lý khi chọn ngày
  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateOfBirth;

    // Trên Android, sau khi chọn xong cần ẩn picker đi ngay
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "set" || Platform.OS === "ios") {
      setDateOfBirth(currentDate);
      // Format ngày thành chuỗi DD/MM/YYYY để hiển thị
      let fDate =
        currentDate.getDate() +
        "/" +
        (currentDate.getMonth() + 1) +
        "/" +
        currentDate.getFullYear();
      setDobText(fDate);
    }
  };

  // Hàm toggle lịch (cho iOS cần xử lý nút Done nếu muốn, ở đây làm đơn giản)
  const toggleDatepicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  const handleRegister = async () => {
    // ---------------------------------------------------------
    // BƯỚC 1: VALIDATION (Kiểm tra dữ liệu đầu vào phía Client)
    // ---------------------------------------------------------
    if (
      !fullname ||
      !gender ||
      !dateOfBirth ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      alert("Vui lòng điền đầy đủ thông tin"); // Tốt hơn nên dùng Toast hoặc Text đỏ dưới input
      return;
    }

    if (password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    if (password.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    // Bắt đầu loading để chặn người dùng bấm nút nhiều lần
    setLoading(true);

    try {
      const payload = {
        full_name: fullname.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        gender: gender,
        date_of_birth: dateOfBirth?.toISOString().split("T")[0] || "",
      };

      const API_URL = "http://10.0.2.2:8000/accounts/register/"; // Thay bằng IP nếu cần
      const response = await axios.post(API_URL, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const data = response.data;

      // Nếu backend trả token thì lưu vào SecureStore
      // if (data.token) {
      //   await SecureStore.setItemAsync("auth_token", data.token);
      // }

      // await SecureStore.setItemAsync("user_info", JSON.stringify(data.user));

      const { token, user } = response.data;
            await AsyncStorage.setItem("auth_token", token); // Lưu token
            await AsyncStorage.setItem("user_info", JSON.stringify(user));

      Alert.alert("Đăng ký thành công!");
      router.push("/(home)/HealthInfo");
    } catch (error: any) {
      console.error("Lỗi đăng ký:", error);
      Alert.alert(error.response?.data?.error || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ... Logo và Header giữ nguyên ... */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign Up</Text>

          <View style={styles.inputsContainer}>
            {/* 1. Full Name */}
            <LoginInput
              placeholder="Full Name"
              value={fullname}
              onChangeText={setFullname}
              editable={!loading}
            />

            {/* 2. Email */}
            <LoginInput
              placeholder="Email Address"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              autoCapitalize="none"
            />

            {/* 3. Password */}
            <LoginInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            {/* 4. Confirm Password */}
            <LoginInput
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />

            {/* 5. Date of Birth - ĐÃ SỬA ĐỔI */}
            <View style={localStyles.datePickerContainer}>
              <Text style={localStyles.sectionLabel}>Date of Birth</Text>

              {/* TouchableOpacity bọc LoginInput để bắt sự kiện click */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <LoginInput
                  placeholder="DD/MM/YYYY"
                  value={dobText}
                  editable={false} // Không cho nhập trực tiếp
                />
              </TouchableOpacity>

              {/* Hiển thị DatePicker khi showDatePicker = true */}
              {showDatePicker && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={dateOfBirth}
                  mode="date"
                  is24Hour={true}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") setShowDatePicker(false); // Android tự ẩn sau chọn
                    if (selectedDate) {
                      setDateOfBirth(selectedDate);
                      const fDate = `${selectedDate.getDate()}/${
                        selectedDate.getMonth() + 1
                      }/${selectedDate.getFullYear()}`;
                      setDobText(fDate);
                    }
                  }}
                  maximumDate={new Date()} // Không cho chọn ngày tương lai
                />
              )}

              {/* Nút Done/Cancel cho iOS */}
              {showDatePicker && Platform.OS === "ios" && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 8,
                  }}
                >
                  <TouchableOpacity
                    style={[
                      localStyles.iosButton,
                      { backgroundColor: "#f0f0f0" },
                    ]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{ color: colors.textBody }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      localStyles.iosButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 6. Gender */}
            <View style={localStyles.pickerContainer}>
              <Text style={localStyles.pickerLabel}>Gender</Text>
              <View style={localStyles.genderOptions}>
                {["Male", "Female", "Other"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      localStyles.genderButton,
                      gender === option.toLowerCase() &&
                        localStyles.genderButtonActive,
                    ]}
                    onPress={() => setGender(option.toLowerCase())}
                  >
                    <Text
                      style={[
                        localStyles.genderButtonText,
                        gender === option.toLowerCase() &&
                          localStyles.genderButtonTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ... Buttons và Footer giữ nguyên ... */}
          <PrimaryButton
            title="Sign Up"
            onPress={handleRegister}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  // ... Các style cũ giữ nguyên ...
  sectionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: colors.primary,
    marginBottom: 8,
    marginTop: 4,
    textTransform: "uppercase",
  },
  pickerContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  // Style cho DateTimePicker trên iOS/Android nếu cần
  datePicker: {
    width: "100%",
  },
  pickerLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: colors.inputPlaceholder,
    marginBottom: 12,
  },
  // Style cho nút Gender
  genderOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputUnderline,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  genderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textBody,
  },
  genderButtonTextActive: {
    color: "white",
    fontFamily: typography.fontFamilyBold,
  },
  // Style mới cho iOS DatePicker buttons
  iosButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    marginBottom: 10,
  },
});
