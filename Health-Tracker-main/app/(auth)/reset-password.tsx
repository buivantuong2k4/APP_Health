import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { API_BASE_URL } from "../config/api";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LoginInput from "../../components/LoginInput";
import PrimaryButton from "../../components/PrimaryButton";
import { authScreenStyles as styles } from "../../constants/authScreenStyles";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams(); // token lấy từ URL

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setMessage("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/reset_password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: password,
          confirm_password: confirmPassword, // ⬅ backend yêu cầu
        }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Thành công", "Mật khẩu đã được đổi", [
          { text: "OK", onPress: () => router.push("/(auth)/Login") },
        ]);
      } else {
        setMessage(data.error || "Không thể đặt lại mật khẩu");
      }
    } catch (err) {
      console.log(err);
      setMessage("Có lỗi xảy ra. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.appTitle}>HEALTH TRACKER</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>

          <Text style={styles.description}>
            Enter your new password and confirm to complete the reset process
          </Text>

          {/* Inputs */}
          <View style={styles.inputsContainer}>
            <LoginInput
              placeholder="New Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <LoginInput
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
          </View>

          {/* Error message */}
          {message !== "" && (
            <Text style={{ color: "red", marginTop: 10 }}>{message}</Text>
          )}

          {/* Submit */}
          <PrimaryButton
            title="Reset Password"
            loading={loading}
            onPress={handleReset}
          />

          {/* Back to Login */}
          <View style={styles.backToLoginContainer}>
            <Text style={styles.backToLoginText}>Remembered your password? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/Login")}>
              <Text style={styles.backToLoginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
