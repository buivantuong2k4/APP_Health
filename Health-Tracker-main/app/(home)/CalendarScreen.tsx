import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Sidebar from "../../components/Sidebar";
import AsyncStorage from "@react-native-async-storage/async-storage";


// --- CẤU HÌNH API ---
const API_URL = "http://10.0.2.2:8000"; 
 

// --- CẤU HÌNH MÀU SẮC ---
const colors = {
  primary: '#4A90E2',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#888888',
  success: '#2ECC71',
  danger: '#FF6B6B',
  border: '#F0F0F0'
};

const DAILY_GOALS = { intake: 2000, burn: 500 };

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

type Activity = {
    id: string;
    instanceId?: string; 
    title: string;
    icon: string;
    type: string; // 'meal' | 'workout'
    cal: number;
    time: string;
    description?: string;
    duration?: string;
    isCompleted?: boolean;
};

type WeeklyPlanData = {
    [key: string]: Activity[];
};

export default function CalendarScreen() {
  const router = useRouter();

//   LẤY USER_ID TỪ ASYNC STORAGE ---
 const [user, setUser] = useState<any | null>(null);

useEffect(() => {
  (async () => {
    try {
      const data = await AsyncStorage.getItem("user_info");
      setUser(data ? JSON.parse(data) : null);
    } catch (e) {
      console.warn("Failed to load user:", e);
    }
  })();
}, []);

  
  // STATE DATA
  const USER_ID = user?.user_id ||1 ;
  const [planId, setPlanId] = useState<number | null>(null);
  const [weekData, setWeekData] = useState<WeeklyPlanData>({});
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // STATE UI
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); 
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // --- 1. LẤY DỮ LIỆU TỪ API ---
  useFocusEffect(
    useCallback(() => {
      fetchCurrentPlan();
    }, [])
  );

  const fetchCurrentPlan = async () => {
      try {
          // Backend GET đã được sửa để merge dữ liệu từ bảng tracking vào JSON
          const response = await fetch(`${API_URL}/api/plan/current?user_id=${USER_ID}`);
          const data = await response.json();
          
          if (data && data.plan_id) {
              setPlanId(data.plan_id);
              
              if (data.start_date) {
                  const start = new Date(data.start_date);
                  setStartDate(start);
                  
                  // Auto-select today
                  const today = new Date();
                  // Reset giờ để so sánh ngày chính xác
                  today.setHours(0,0,0,0);
                  const startCheck = new Date(start);
                  startCheck.setHours(0,0,0,0);

                  const diffTime = today.getTime() - startCheck.getTime();
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
                  
                  if (diffDays >= 0 && diffDays <= 6) {
                     setSelectedDayIndex(diffDays);
                  }
              }

              const { plan_id, start_date, end_date, ...realPlanData } = data;
              setWeekData(realPlanData);
          }
      } catch (error) {
          console.error("Lỗi lấy lịch:", error);
          Alert.alert("Lỗi", "Không thể kết nối đến server.");
      } finally {
          setLoading(false);
      }
  };

  // --- 2. CẬP NHẬT TRẠNG THÁI (TRACKING API MỚI) ---
 const toggleComplete = async (item: Activity) => {
      if (!planId || !startDate) return;

      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + selectedDayIndex);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dbItemType = item.type === 'meal' ? 'food' : 'exercise';
      const newStatus = !item.isCompleted;

      // Update Local State ... (Giữ nguyên)
      const currentDayKey = DAY_KEYS[selectedDayIndex];
      const updatedWeekData = { ...weekData };
      const updatedDayList = updatedWeekData[currentDayKey].map(i => {
          // So sánh cả instanceId để đảm bảo đúng item (nếu có 2 món giống nhau)
          if (i.instanceId === item.instanceId) { 
              return { ...i, isCompleted: newStatus };
          }
          return i;
      });
      updatedWeekData[currentDayKey] = updatedDayList;
      setWeekData(updatedWeekData);

      // Gọi API Tracking
      try {
          await fetch(`${API_URL}/api/plan/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  user_id: USER_ID,
                  weekly_plan_id: planId,
                  date: dateStr,
                  item_type: dbItemType,
                  item_id: item.id,
                  is_completed: newStatus ? 1 : 0,
                  instance_id: item.instanceId // <--- THÊM DÒNG NÀY QUAN TRỌNG
              })
          });
      } catch (error) {
          console.error("Lỗi tracking:", error);
      }
  };

  // --- LOGIC TÍNH TOÁN HIỂN THỊ ---
  const currentDayKey = DAY_KEYS[selectedDayIndex];
  const currentDayActivities = weekData[currentDayKey] || [];

  const summary = useMemo(() => {
      let currentIntake = 0;
      let currentBurn = 0;
      
      currentDayActivities.forEach(item => {
          if (item.isCompleted) {
              const cal = Math.abs(item.cal);
              if (item.type === 'meal') currentIntake += cal;
              if (item.type === 'workout') currentBurn += cal;
          }
      });
      
      return { 
          intake: currentIntake, 
          burn: currentBurn, 
          net: currentIntake - currentBurn,
          intakeProgress: Math.min(currentIntake / DAILY_GOALS.intake, 1),
          burnProgress: Math.min(currentBurn / DAILY_GOALS.burn, 1)
      };
  }, [currentDayActivities]);

  // Helper tính ngày hiển thị
  const getDateNumber = (offsetIndex: number) => {
      if (!startDate) return offsetIndex + 1; 
      const d = new Date(startDate);
      d.setDate(d.getDate() + offsetIndex);
      return d.getDate();
  };
  
  const isTodayCheck = (offsetIndex: number) => {
      if (!startDate) return false;
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + offsetIndex);
      const today = new Date();
      return checkDate.getDate() === today.getDate() && checkDate.getMonth() === today.getMonth();
  };

  const renderCard = (item: Activity) => {
      const isDone = item.isCompleted || false;
      const isWorkout = item.type === 'workout';
      const themeColor = isWorkout ? colors.danger : colors.success;
      
      return (
        <TouchableOpacity 
            key={item.instanceId || item.id} 
            style={[styles.card, isDone && styles.cardDone]}
            onPress={() => {
                setSelectedActivity(item);
                setShowDetail(true);
            }}
            activeOpacity={0.8}
        >
            <View style={styles.timeCol}>
                <Text style={styles.timeText}>{item.time}</Text>
                {isWorkout && item.duration && <Text style={styles.durationText}>{item.duration}</Text>}
            </View>

            <View style={[styles.vLine, { backgroundColor: themeColor }]} />

            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, isDone && styles.textDone]}>{item.title}</Text>
                <View style={styles.cardMeta}>
                      <Text style={{marginRight: 6, fontSize: 14}}>{item.icon}</Text>
                      <Text style={styles.cardSub}>
                         {isWorkout ? 'Đốt' : 'Nạp'} <Text style={{fontWeight:'bold', color: themeColor}}>{Math.abs(item.cal)}</Text> Kcal
                      </Text>
                </View>
            </View>

            <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.checkBox}>
                 <Ionicons 
                    name={isDone ? "checkmark-circle" : "ellipse-outline"} 
                    size={28} 
                    color={isDone ? themeColor : "#DDD"} 
                 />
            </TouchableOpacity>
        </TouchableOpacity>
      );
  };

  if (loading) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
              <ActivityIndicator size="large" color={colors.primary} />
          </View>
      )
  }

  if (!planId) {
      return (
          <SafeAreaView style={[styles.safeArea, {justifyContent:'center', alignItems:'center'}]}>
               <Ionicons name="calendar-outline" size={80} color="#DDD" />
               <Text style={{color: '#888', marginTop: 20, fontSize: 16}}>Bạn chưa có lịch trình nào.</Text>
               <TouchableOpacity 
                    style={[styles.modalBtn, {width: 200}]} 
                    onPress={() => router.push("/(home)/RecommendationScreen")}
               >
                   <Text style={styles.modalBtnText}>Tạo Lịch Mới</Text>
               </TouchableOpacity>
          </SafeAreaView>
      )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.menuBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Trình Hôm Nay</Text>
        <View style={styles.avatarContainer}>
             <Text style={{fontSize: 20}}>🧘‍♂️</Text>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 16}}>
            {DAY_LABELS.map((dayLabel, index) => {
                const isSelected = selectedDayIndex === index;
                const dateNum = getDateNumber(index);
                const isToday = isTodayCheck(index);

                return (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.dayItem]}
                        onPress={() => setSelectedDayIndex(index)}
                    >
                        <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{dayLabel}</Text>
                        <View style={[styles.dateBubble, isSelected && styles.dateBubbleActive]}>
                            <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{dateNum}</Text>
                        </View>
                        {isToday && <View style={styles.todayDot} />}
                    </TouchableOpacity>
                )
            })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.summaryCard}>
            <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Đã Nạp (In)</Text>
                <View style={styles.valContainer}>
                    <Text style={[styles.summaryVal, {color: colors.success}]}>{summary.intake}</Text>
                    <Text style={styles.targetVal}> / {DAILY_GOALS.intake}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${summary.intakeProgress * 100}%`, backgroundColor: colors.success }]} />
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Đã Đốt (Out)</Text>
                <View style={styles.valContainer}>
                    <Text style={[styles.summaryVal, {color: colors.danger}]}>{summary.burn}</Text>
                    <Text style={styles.targetVal}> / {DAILY_GOALS.burn}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${summary.burnProgress * 100}%`, backgroundColor: colors.danger }]} />
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Net Calo</Text>
                <Text style={[styles.summaryVal, {color: '#333'}]}>{summary.net}</Text>
                <Text style={[styles.summaryUnit, {marginTop: 4}]}>
                    {summary.net > 0 ? "Dư thừa" : "Thâm hụt"}
                </Text>
            </View>
        </View>

        <View style={styles.sectionHeaderBox}>
             <Text style={styles.sectionTitle}>Dinh Dưỡng</Text>
             <View style={styles.badgeCount}>
                 <Text style={styles.badgeText}>
                    {currentDayActivities.filter(i => i.type === 'meal').length}
                 </Text>
             </View>
        </View>
        
        {currentDayActivities.filter(i => i.type === 'meal').length > 0 ? (
            currentDayActivities.filter(i => i.type === 'meal').map(renderCard)
        ) : (
            <Text style={styles.emptyText}>Chưa có thực đơn cho ngày này.</Text>
        )}

        <View style={[styles.sectionHeaderBox, {marginTop: 24}]}>
             <Text style={styles.sectionTitle}>Luyện Tập</Text>
             <View style={[styles.badgeCount, {backgroundColor: colors.danger}]}>
                 <Text style={styles.badgeText}>
                    {currentDayActivities.filter(i => i.type === 'workout').length}
                 </Text>
             </View>
        </View>

        {currentDayActivities.filter(i => i.type === 'workout').length > 0 ? (
            currentDayActivities.filter(i => i.type === 'workout').map(renderCard)
        ) : (
             <Text style={styles.emptyText}>Hôm nay là ngày nghỉ ngơi.</Text>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
         <View style={styles.modalOverlay}>
             <View style={styles.modalContent}>
                 <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chi tiết hoạt động</Text>
                    <TouchableOpacity onPress={() => setShowDetail(false)}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                 </View>
                 
                 {selectedActivity && (
                     <>
                        <View style={{alignItems: 'center', marginVertical: 20}}>
                             <View style={[styles.bigIconCircle, {backgroundColor: selectedActivity.type === 'workout' ? '#FFF0F0' : '#E8F5E9'}]}>
                                <Text style={{fontSize: 40}}>{selectedActivity.icon}</Text>
                             </View>
                             <Text style={styles.modalActivityTitle}>{selectedActivity.title}</Text>
                             <View style={[styles.tag, {backgroundColor: selectedActivity.type === 'workout' ? '#FFF0F0' : '#E8F5E9'}]}>
                                 <Text style={{color: selectedActivity.type === 'workout' ? colors.danger : colors.success, fontWeight: 'bold', fontSize: 12}}>
                                     {selectedActivity.type === 'workout' ? 'LUYỆN TẬP' : 'DINH DƯỠNG'}
                                 </Text>
                             </View>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Thời gian:</Text>
                            <Text style={styles.detailVal}>{selectedActivity.time}</Text>
                        </View>
                        {selectedActivity.duration && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Thời lượng:</Text>
                                <Text style={styles.detailVal}>{selectedActivity.duration}</Text>
                            </View>
                        )}
                         <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Calo dự kiến:</Text>
                            <Text style={styles.detailVal}>{Math.abs(selectedActivity.cal)} Kcal</Text>
                        </View>
                        <View style={[styles.detailRow, {borderBottomWidth: 0}]}>
                            <Text style={styles.detailLabel}>Ghi chú:</Text>
                            <Text style={[styles.detailVal, {flex: 1, textAlign: 'right', fontWeight: '400'}]}>
                                {selectedActivity.description || 'Không có ghi chú'}
                            </Text>
                        </View>

                        <TouchableOpacity 
                            style={[styles.modalBtn, selectedActivity.isCompleted && styles.modalBtnOutline]} 
                            onPress={() => {
                                toggleComplete(selectedActivity);
                                setShowDetail(false);
                            }}
                        >
                            <Text style={[styles.modalBtnText, selectedActivity.isCompleted && {color: colors.primary}]}>
                                {selectedActivity.isCompleted ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
                            </Text>
                        </TouchableOpacity>
                     </>
                 )}
             </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
      paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 10, 
      backgroundColor: colors.white 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  menuBtn: { padding: 4 },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  calendarContainer: { paddingVertical: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayItem: { alignItems: 'center', marginRight: 16, width: 50 },
  dayName: { fontSize: 13, color: colors.textLight, marginBottom: 6 },
  dayNameActive: { color: colors.primary, fontWeight: 'bold' },
  dateBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  dateBubbleActive: { backgroundColor: colors.primary },
  dateNum: { fontSize: 16, fontWeight: '600', color: colors.text },
  dateNumActive: { color: colors.white },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 },
  content: { padding: 20 },
  summaryCard: { 
      flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, 
      paddingVertical: 20, paddingHorizontal: 12, marginBottom: 24, 
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, 
      justifyContent: 'space-between' 
  },
  summaryCol: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 11, color: colors.textLight, marginBottom: 6, textTransform: 'uppercase', fontWeight: '600' },
  valContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  summaryVal: { fontSize: 18, fontWeight: 'bold' },
  targetVal: { fontSize: 12, color: '#999', fontWeight: '500' },
  summaryUnit: { fontSize: 10, color: '#999' },
  divider: { width: 1, backgroundColor: colors.border, height: '70%', alignSelf: 'center' },
  progressBarBg: { width: '80%', height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  sectionHeaderBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginRight: 8 },
  badgeCount: { backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: colors.textLight, fontStyle: 'italic', marginBottom: 10, marginLeft: 4 },
  card: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, 
      borderRadius: 16, padding: 16, marginBottom: 12, 
      shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 
  },
  cardDone: { opacity: 0.6, backgroundColor: '#FAFAFA' },
  timeCol: { width: 50, alignItems: 'center', marginRight: 10 },
  timeText: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  durationText: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  vLine: { width: 3, height: '80%', borderRadius: 2, marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  textDone: { textDecorationLine: 'line-through', color: colors.textLight },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardSub: { fontSize: 12, color: colors.textLight },
  checkBox: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.white, borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  bigIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalActivityTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: colors.text },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  detailLabel: { color: colors.textLight, fontSize: 15 },
  detailVal: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modalBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24 },
  modalBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  modalBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 }
});