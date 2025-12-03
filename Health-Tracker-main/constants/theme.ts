// constants/theme.ts

// ==============================
//  MÀU SẮC CHÍNH CHO APP
// ==============================
export const colors = {
  // Nền tổng thể
  background: "#F4FBFB", // nền xanh rất nhạt giống ảnh
  backgroundGradientStart: "#E6F7F7",
  backgroundGradientEnd: "#F8FEFF",

  // Màu thương hiệu (HEALTH TRACKER + nút chính)
  primary: "#27B1A9", // xanh ngọc chính
  primaryDark: "#1A857F", // xanh đậm hơn dùng cho nhấn
  primaryLight: "#A8E6E1", // xanh nhạt cho hover / bg nhẹ

  // Card form (khung Sign In / Sign Up)
  cardBackground: "#FFFFFF",
  cardBorder: "#E3F1F0",
  cardSoftBg: "#F5FBFB",

  // Text
  textHeading: "#1B3B3A", // tiêu đề Sign In / Sign Up
  textBody: "#4F5F5F", // nội dung, label
  textMuted: "#9BA9A8", // placeholder, caption
  textOnPrimary: "#FFFFFF", // chữ trên nút xanh

  // Input
  inputUnderline: "#C6D8D7",
  inputPlaceholder: "#A6B8B7",

  // Button phụ (Google / Apple)
  socialButtonBg: "#F5F7F8",
  socialButtonBorder: "#D5E0E0",
  socialButtonText: "#4F5F5F",

  // Trạng thái
  success: "#2ECC71",
  warning: "#F1C40F",
  error: "#E74C3C",
};

// ==============================
//  FONT & KIỂU CHỮ
// ==============================
//
// Gợi ý dùng font: "Poppins"
// - Nhìn hiện đại, phù hợp app sức khỏe
// - Dễ đọc cho cả tiêu đề và nội dung
//
// Khi dùng Expo có thể cài:
//   expo install @expo-google-fonts/poppins expo-font
// Và load các font: Poppins_400Regular, Poppins_500Medium, Poppins_700Bold
//
export const typography = {
  fontFamilyRegular: "Poppins-Regular",
  fontFamilyMedium: "Poppins-Medium",
  fontFamilyBold: "Poppins-Bold",

  heading1: {
    fontFamily: "Poppins-Bold",
    fontSize: 28,
    letterSpacing: 0.5,
  },
  heading2: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  caption: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
};

// ==============================
//  SHADOW CHO CARD / BUTTON NỔI
// ==============================
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
};
