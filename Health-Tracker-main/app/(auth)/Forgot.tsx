import { useRouter } from "expo-router";

import { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "http://10.0.2.2:8000/accounts/forgot_password/", // dùng IP LAN cho thiết bị thật
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        const resetToken = data.reset_token; // lấy token từ response

        // Chuyển sang màn hình reset-password và truyền token
        router.push({
          pathname: "/(auth)/reset-password",
          params: { token: resetToken },
        });
      } else {
        Alert.alert("Lỗi", data.error || "Email không tồn tại");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Lỗi", "Có lỗi xảy ra. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* App Logo/Title */}
        <View style={styles.logoContainer}>
          <Text style={styles.appTitle}>HEALTH TRACKER</Text>
        </View>

        {/* Forgot Password Form Card */}
        <View style={styles.card}>
          {/* Card Header */}
          <Text style={styles.cardTitle}>Forgot Password</Text>

          {/* Description */}
          <Text style={styles.description}>
            Enter your email or phone number and we will send you a link to
            reset your password
          </Text>

          {/* Input */}
          <View style={styles.inputsContainer}>
            <LoginInput
              placeholder="Email or Phone Number"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmailOrPhone}
              editable={!loading}
            />
          </View>

          {/* Reset Button */}
          <PrimaryButton
            title="Send Reset Link"
            loading={loading}
            onPress={handleResetPassword}
          />

          {/* Back to Login Link */}
          <View style={styles.backToLoginContainer}>
            <Text style={styles.backToLoginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/Login")}>
              <Text style={styles.backToLoginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
