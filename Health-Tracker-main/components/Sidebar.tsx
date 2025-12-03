import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
// import { colors } from "../constants/theme"; // Dùng dòng này nếu bạn đã có file theme

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75; // Sidebar chiếm 75% chiều rộng

// --- MÀU SẮC DỰ PHÒNG (Nếu chưa config theme) ---
const colors = {
  primary: '#4A90E2',
  text: '#333',
  textLight: '#888',
  background: '#FFF',
  overlay: 'rgba(0,0,0,0.5)',
  border: '#F0F0F0',
  danger: '#FF6B6B'
};

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

// --- CẤU TRÚC MENU KHOA HỌC ---
const MENU_GROUPS = [
  {
    title: "TỔNG QUAN",
    items: [
      { label: "Dashboard", route: "/(home)/DashboardScreen", icon: "grid-outline" },
      { label: "Lịch trình tuần", route: "/(home)/CalendarScreen", icon: "calendar-number-outline" },
      { label: "Báo cáo & Thống kê", route: "/(home)/ReportsScreen", icon: "stats-chart-outline" },
    ]
  },
  {
    title: "CÁ NHÂN HÓA",
    items: [
      { label: "AI Gợi ý thực đơn", route: "/(home)/RecommendationScreen", icon: "sparkles-outline" },
      // Gộp Mức độ vận động vào trong Hồ sơ sức khỏe
      { label: "Hồ sơ sức khỏe", route: "/(home)/HealthProfileScreen", icon: "person-circle-outline" },
    ]
  },
  {
    title: "HỆ THỐNG",
    items: [
      { label: "Cài đặt ứng dụng", route: "/(home)/SettingsScreen", icon: "settings-outline" }, // Placeholder
    ]
  }
];

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname(); // Hook để lấy đường dẫn hiện tại

  const handleNavigate = (route: string) => {
    onClose();
    // Delay nhẹ để hiệu ứng đóng menu mượt mà trước khi chuyển trang
    setTimeout(() => {
        router.push(route as any);
    }, 200);
  };

  const handleLogout = () => {
      onClose();
      router.replace("/(auth)/Login");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade" // Fade nhẹ nhàng cho lớp nền tối
      onRequestClose={onClose} // Xử lý nút Back cứng trên Android
    >
      <View style={styles.overlay}>
        
        {/* 1. VÙNG TỐI (BACKGROUND) - Bấm vào đây để đóng */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.background} />
        </TouchableWithoutFeedback>

        {/* 2. SIDEBAR CONTAINER - Ghim đè lên bên trái */}
        <View style={styles.sidebarContainer}>
          <SafeAreaView style={styles.safeArea}>
            
            {/* --- HEADER: USER INFO --- */}
            <View style={styles.header}>
               <View style={styles.avatarWrapper}>
                   <Image 
                      source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                      style={styles.avatar} 
                   />
                   <View style={styles.onlineDot} />
               </View>
               <View style={styles.userInfo}>
                   <Text style={styles.userName} numberOfLines={1}>Nguyễn Văn A</Text>
                   <Text style={styles.userStatus}>Member</Text>
               </View>
               <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                   <Ionicons name="close" size={24} color={colors.textLight} />
               </TouchableOpacity>
            </View>

            {/* --- BODY: MENU LIST --- */}
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {MENU_GROUPS.map((group, groupIndex) => (
                    <View key={groupIndex} style={styles.groupContainer}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        
                        {group.items.map((item, index) => {
                            // Kiểm tra xem item này có đang active không
                            const isActive = pathname === item.route;
                            
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                                    onPress={() => handleNavigate(item.route)}
                                >
                                    {/* Thanh chỉ báo bên trái khi Active */}
                                    {isActive && <View style={styles.activeIndicator} />}
                                    
                                    <Ionicons 
                                        name={item.icon as any} 
                                        size={22} 
                                        color={isActive ? colors.primary : "#666"} 
                                        style={{ marginLeft: isActive ? 10 : 0 }} // Thụt vào một chút nếu active
                                    />
                                    <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>

            {/* --- FOOTER: LOGOUT & VERSION --- */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <View style={styles.logoutIconBox}>
                        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    </View>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
                <Text style={styles.versionText}>HealthTracker v1.0.2</Text>
            </View>

          </SafeAreaView>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Overlay bao trùm toàn màn hình
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Màu đen mờ 50%
  },
  
  // Vùng bấm để đóng (chiếm toàn bộ màn hình, nhưng nằm dưới Sidebar nhờ zIndex)
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  // Sidebar chính - Ghim tuyệt đối bên trái
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.background,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    // Đổ bóng sang phải tạo chiều sâu
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20, // Shadow đậm cho Android
    zIndex: 100,   // Đảm bảo luôn nổi trên background
  },

  safeArea: {
    flex: 1,
  },
  
  // --- HEADER ---
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 50 : 20, // Fix tai thỏ
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E0E0E0',
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2ECC71',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 13,
    color: colors.textLight,
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden'
  },
  closeBtn: {
      padding: 8,
      marginRight: -8
  },

  // --- BODY ---
  body: {
    flex: 1,
    paddingVertical: 16,
  },
  groupContainer: {
      marginBottom: 24,
  },
  groupTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#AAA',
      marginLeft: 24,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 2,
  },
  menuItemActive: {
      backgroundColor: colors.primary + '15', // Màu primary mờ 15%
  },
  menuText: {
    fontSize: 15,
    marginLeft: 14,
    color: '#555',
    fontWeight: '500',
  },
  menuTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
  },
  activeIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.primary,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
  },

  // --- FOOTER ---
  footer: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
  },
  logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: '#FFF5F5', // Nền đỏ rất nhạt
      padding: 12,
      borderRadius: 12,
  },
  logoutIconBox: {
      marginRight: 12,
  },
  logoutText: {
      color: colors.danger,
      fontWeight: 'bold',
      fontSize: 15,
  },
  versionText: {
      fontSize: 11,
      color: '#CCC',
      textAlign: 'center',
  }
});