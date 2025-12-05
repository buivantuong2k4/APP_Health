import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { API_BASE_URL } from "../config/api";
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

// --- THEME COLORS ---
const colors = {
  primary: "#4A90E2",
  background: "#F8F9FA",
  white: "#FFFFFF",
  text: "#333333",
  textLight: "#888888",
  border: "#F0F0F0",
  inputBg: "#F5F7FA",
  danger: "#FF6B6B",
  success: "#2ECC71",
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updatePassword = async (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    const token = await AsyncStorage.getItem("auth_token");

    const res = await fetch(`${API_BASE_URL}/accounts/post_password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    const data = await res.json();
    return data;
  };

  // Form State
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // Visibility State (Ẩn/Hiện password)
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    // 1️⃣ Validate
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (newPass !== confirmPass) {
      Alert.alert("Lỗi", "Mật khẩu mới và xác nhận không khớp.");
      return;
    }

    if (newPass.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (currentPass === newPass) {
      Alert.alert("Lỗi", "Mật khẩu mới không được trùng với mật khẩu cũ.");
      return;
    }

    // 2️⃣ Gọi API thật
    setLoading(true);

    try {
      const res = await updatePassword(currentPass, newPass, confirmPass);

      setLoading(false);

      if (res.error) {
        Alert.alert("Lỗi", res.error);
        return;
      }

      Alert.alert("Thành công", "Mật khẩu của bạn đã được thay đổi!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      setLoading(false);
      Alert.alert("Lỗi", "Không thể kết nối máy chủ.");
    }
  };

  // Helper render Input có nút mắt
  const renderPasswordInput = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    showPass: boolean,
    setShowPass: (b: boolean) => void,
    placeholder: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          secureTextEntry={!showPass}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPass(!showPass)}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={showPass ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi Mật Khẩu</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.formCard}>
            {/* Current Password */}
            {renderPasswordInput(
              "Mật khẩu hiện tại",
              currentPass,
              setCurrentPass,
              showCurrent,
              setShowCurrent,
              "Nhập mật khẩu cũ"
            )}

            <TouchableOpacity
              style={{ alignSelf: "flex-end", marginBottom: 20 }}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* New Password */}
            {renderPasswordInput(
              "Mật khẩu mới",
              newPass,
              setNewPass,
              showNew,
              setShowNew,
              "Tối thiểu 6 ký tự"
            )}

            {/* Confirm Password */}
            {renderPasswordInput(
              "Xác nhận mật khẩu mới",
              confirmPass,
              setConfirmPass,
              showConfirm,
              setShowConfirm,
              "Nhập lại mật khẩu mới"
            )}
          </View>

          {/* Password Requirements Hint */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintTitle}>Mật khẩu mạnh nên có:</Text>
            <View style={styles.hintItem}>
              <Ionicons
                name={
                  newPass.length >= 6 ? "checkmark-circle" : "ellipse-outline"
                }
                size={16}
                color={newPass.length >= 6 ? colors.success : "#999"}
              />
              <Text
                style={[
                  styles.hintText,
                  newPass.length >= 6 && styles.hintTextActive,
                ]}
              >
                Tối thiểu 6 ký tự
              </Text>
            </View>
            <View style={styles.hintItem}>
              <Ionicons
                name={
                  /[A-Z]/.test(newPass) ? "checkmark-circle" : "ellipse-outline"
                }
                size={16}
                color={/[A-Z]/.test(newPass) ? colors.success : "#999"}
              />
              <Text
                style={[
                  styles.hintText,
                  /[A-Z]/.test(newPass) && styles.hintTextActive,
                ]}
              >
                Ít nhất 1 chữ hoa
              </Text>
            </View>
            <View style={styles.hintItem}>
              <Ionicons
                name={
                  /[0-9]/.test(newPass) ? "checkmark-circle" : "ellipse-outline"
                }
                size={16}
                color={/[0-9]/.test(newPass) ? colors.success : "#999"}
              />
              <Text
                style={[
                  styles.hintText,
                  /[0-9]/.test(newPass) && styles.hintTextActive,
                ]}
              >
                Ít nhất 1 số
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading ? "Đang cập nhật..." : "Lưu thay đổi"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Fallback color constants if needed
colors.success = "#2ECC71";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

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
  backBtn: { padding: 4 },

  content: { padding: 20 },

  formCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textLight,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  eyeBtn: { padding: 14 },

  forgotText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  divider: { height: 1, backgroundColor: colors.border, marginBottom: 20 },

  // Hints
  hintContainer: { paddingHorizontal: 10 },
  hintTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
  },
  hintItem: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  hintText: { fontSize: 13, color: "#999", marginLeft: 8 },
  hintTextActive: { color: colors.text, fontWeight: "500" },

  // Footer
  footer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  btnDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontWeight: "bold", fontSize: 16 },
});
