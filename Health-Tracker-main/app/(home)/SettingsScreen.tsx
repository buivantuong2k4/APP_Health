import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Sidebar from "../../components/Sidebar";

// --- THEME COLORS ---
const colors = {
  primary: '#4A90E2',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#888888',
  border: '#F0F0F0',
  danger: '#FF6B6B'
};

export default function SettingsScreen() {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);

  // --- SETTINGS STATE ---
  const [notifications, setNotifications] = useState({
      workout: true,
      meal: false,
      weekly: true,
  });

  // --- ACTIONS ---
  const toggleNotification = (key: keyof typeof notifications) => {
      setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
      Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng xuất", style: "destructive", onPress: () => router.replace("/(auth)/Login") }
      ]);
  };

  // --- RENDER HELPERS ---
  const renderSectionHeader = (title: string) => (
      <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderSettingItem = ({ 
      label, 
      icon, 
      color = colors.text, 
      type = 'link', 
      value = false, 
      onPress,
      subLabel = ''
  }: any) => (
      <TouchableOpacity 
          style={styles.itemContainer} 
          onPress={type === 'link' ? onPress : undefined}
          activeOpacity={type === 'toggle' ? 1 : 0.7}
      >
          <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                  <Ionicons name={icon} size={20} color={color} />
              </View>
              <View>
                  <Text style={styles.itemLabel}>{label}</Text>
                  {subLabel ? <Text style={styles.itemSubLabel}>{subLabel}</Text> : null}
              </View>
          </View>

          <View style={styles.itemRight}>
              {type === 'toggle' && (
                  <Switch 
                      value={value} 
                      onValueChange={onPress}
                      trackColor={{ false: "#E0E0E0", true: colors.primary }}
                      thumbColor={"#FFF"}
                  />
              )}
              {type === 'link' && (
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
              )}
          </View>
      </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.menuBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài Đặt</Text>
        <View style={{width: 28}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- SECTION 1: TÀI KHOẢN --- */}
        {renderSectionHeader("TÀI KHOẢN")}
        <View style={styles.sectionCard}>
            {renderSettingItem({
                label: "Hồ sơ cá nhân",
                icon: "person-outline",
                color: colors.primary,
                type: "link",
                subLabel: "Chỉnh sửa thông tin cơ bản",
                onPress: () => router.push("/(home)/UserProfileScreen")
            })}
            <View style={styles.divider} />
            {renderSettingItem({
                label: "Đổi mật khẩu",
                icon: "lock-closed-outline",
                color: "#F39C12",
                type: "link",
                onPress: () => router.push("/(home)/ChangePasswordScreen")
            })}
        </View>

        {/* --- SECTION 2: THÔNG BÁO --- */}
        {renderSectionHeader("THÔNG BÁO & NHẮC NHỞ")}
        <View style={styles.sectionCard}>
            {renderSettingItem({
                label: "Nhắc nhở tập luyện",
                icon: "barbell-outline",
                color: "#E74C3C",
                type: "toggle",
                value: notifications.workout,
                onPress: () => toggleNotification('workout')
            })}
            <View style={styles.divider} />
            {renderSettingItem({
                label: "Nhắc nhở ăn uống",
                icon: "restaurant-outline",
                color: "#E67E22",
                type: "toggle",
                value: notifications.meal,
                onPress: () => toggleNotification('meal')
            })}
            <View style={styles.divider} />
            {renderSettingItem({
                label: "Báo cáo tuần",
                icon: "stats-chart-outline",
                color: "#3498DB",
                type: "toggle",
                value: notifications.weekly,
                onPress: () => toggleNotification('weekly')
            })}
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>HealthTracker v1.0.2</Text>
        <View style={{height: 50}} />

      </ScrollView>

      {/* SIDEBAR */}
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  
  header: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.white,
      borderBottomWidth: 1, borderBottomColor: colors.border
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  menuBtn: { padding: 4 },

  content: { padding: 20 },

  sectionHeader: { 
      fontSize: 12, fontWeight: 'bold', color: colors.textLight, 
      marginBottom: 10, marginTop: 10, marginLeft: 4, textTransform: 'uppercase' 
  },
  sectionCard: {
      backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden',
      shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
      marginBottom: 16
  },
  
  itemContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, paddingHorizontal: 16
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { 
      width: 36, height: 36, borderRadius: 10, 
      justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  itemLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  itemSubLabel: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  
  itemRight: { flexDirection: 'row', alignItems: 'center' },

  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },

  logoutBtn: {
      marginTop: 20, backgroundColor: '#FFF5F5', padding: 16, borderRadius: 12,
      alignItems: 'center', borderWidth: 1, borderColor: '#FFEBEB'
  },
  logoutText: { color: colors.danger, fontWeight: 'bold', fontSize: 16 },
  
  versionText: {
      textAlign: 'center', color: '#CCC', fontSize: 12, marginTop: 20
  }
});