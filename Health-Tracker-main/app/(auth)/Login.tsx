import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios"; // <-- import axios
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store"; // <-- import SecureStore
import { useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoginInput from "../../components/LoginInput";
import PrimaryButton from "../../components/PrimaryButton";
import SocialButton from "../../components/SocialButton";
import { authScreenStyles as styles } from "../../constants/authScreenStyles";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    setLoading(true);

    const API_URL = "http://10.0.2.2:8000/accounts/login/"; // <-- dùng IP mạng, không phải localhost khi chạy trên mobile/web

    try {
      // gọi POST tới Django API
      const response = await axios.post(API_URL, { email, password });
      console.log("Backend response:", response.data); // xem backend trả gì
      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync("jwt_token", response.data.token);
        await SecureStore.setItemAsync(
          "user_info",
          JSON.stringify(response.data.user)
        );
      }
      const { token, user } = response.data;
      await AsyncStorage.setItem("auth_token", token); // Lưu token
      await AsyncStorage.setItem("user_info", JSON.stringify(user));
      alert("Login successful!");
      // Navigate to HealthInfo screen
       router.push("/(home)/DashboardScreen");
          
      } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        alert(error.response.data.error || "Login failed");
      } else {
        alert("Network error");
      }
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

        {/* Login Form Card */}
        <View style={styles.card}>
          {/* Card Header */}
          <Text style={styles.cardTitle}>Sign In</Text>

          {/* Inputs */}
          <View style={styles.inputsContainer}>
            <LoginInput
              placeholder="Email or Mobile Number"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            <LoginInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => router.push("/(auth)/Forgot")}
          >
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <PrimaryButton
            title="Sign In"
            loading={loading}
            onPress={handleLogin}
          />

          {/* Sign Up Link */}
          <View style={styles.signupPromptContainer}>
            <Text style={styles.signupPromptText}>Did not Joined yet? </Text>
            {/* TODO: Frontend - Navigate to register screen */}
            <TouchableOpacity onPress={() => router.push("/(auth)/Register")}>
              <Text style={styles.signupPromptLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          {/* Social Login Buttons */}
          <View style={styles.socialContainer}>
            {/* 
                  TODO: Backend - Implement Google OAuth endpoint
                   */}
            <SocialButton
              icon=""
              label="Continue with Google"
              onPress={() => console.log("Google login")}
            />
          </View>

          <View style={styles.socialContainer}>
            {/* TODO: Backend - Implement Apple OAuth endpoint
             */}
            <SocialButton
              icon="󠀠"
              label="Continue with Apple ID"
              onPress={() => console.log("Apple login")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
