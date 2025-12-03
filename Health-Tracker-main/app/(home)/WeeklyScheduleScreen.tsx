import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
// IMPORT THƯ VIỆN PICKER
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from "../../constants/theme";

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_LABELS = { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' } as const;
const TARGETS = { caloriesIn: 2000, caloriesOut: 500 };

// --- TYPE DEFINITIONS ---
type DayKey = typeof DAYS[number];
type ScheduleItem = {
  id: string;
  title: string;
  icon: string;
  type: string;
  calories?: number;
  cal: number;
  time: string;
  description?: string;
  duration?: string;
  instanceId: string;
};
type WeeklyPlanType = {
  Mon: ScheduleItem[];
  Tue: ScheduleItem[];
  Wed: ScheduleItem[];
  Thu: ScheduleItem[];
  Fri: ScheduleItem[];
  Sat: ScheduleItem[];
  Sun: ScheduleItem[];
};

export default function WeeklyScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

 // =================================================================
// [BE-NOTE] API SPECIFICATION FOR SCHEDULE SCREEN
// =================================================================
//
// 1. GENERATE SCHEDULE (Tạo lịch đề xuất)
// -----------------------------------------------------------------
// Endpoint: POST /api/schedule/generate
// Mô tả: Nhận danh sách món ăn/bài tập, trả về lịch trình 7 ngày.
// Request Body:
// {
//    "startDate": "2023-11-27",
//    "selectedItems": [{ "id": "...", "type": "meal", ... }]
// }
// Response (Success):
// {
//    "success": true,
//    "weekId": "temp_week_123", // ID tạm
//    "schedule": [ ...Array 7 days... ] -> Map vào state 'scheduleData'
// }
//
// -----------------------------------------------------------------
// 2. SAVE SCHEDULE (Lưu/Áp dụng lịch trình)
// -----------------------------------------------------------------
// Endpoint: POST /api/schedule/save
// Mô tả: Người dùng chấp nhận lịch trình đề xuất. Lưu vào DB chính thức.
// Request Body:
// {
//    "weekId": "temp_week_123", (ID từ bước generate nếu có)
//    "startDate": "2023-11-27",
//    "finalSchedule": [ ...Dữ liệu từ state 'scheduleData'... ]
// }
// Response (Success):
// {
//    "success": true,
//    "message": "Schedule applied successfully",
//    "savedWeekId": "official_week_999" // Backend trả về ID chính thức
// }
// =================================================================
  
  const [inventory, setInventory] = useState<ScheduleItem[]>([]);

  // [BE-NOTE] Đây là State chứa dữ liệu lịch trình 7 ngày.
  // Dữ liệu từ API trả về (field 'schedule') cần được set vào biến này.
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanType>({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] });
  const [selectedDay, setSelectedDay] = useState<DayKey>('Mon');

  // MODAL STATES
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  
  // EDITOR FORM STATE
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null); 
  const [formTime, setFormTime] = useState('');
  const [formCal, setFormCal] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [isNew, setIsNew] = useState(false); 

  // STATE CHO TIME PICKER
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date()); // Dùng để lưu tạm giá trị cho Picker

  // ... (Phần useEffect load data giữ nguyên) ...
  useEffect(() => {
      if (params.data) {
          const dataString = typeof params.data === 'string' ? params.data : params.data[0];
          const items = JSON.parse(dataString);
          setInventory(items);
          const newPlan = { ...weeklyPlan };
          newPlan.Mon = items.slice(0, 4).map((item: ScheduleItem, index: number) => ({
              ...item,
              instanceId: Math.random().toString(),
              time: index === 0 ? '07:00' : index === 1 ? '12:00' : index === 2 ? '18:00' : '17:00'
          })).sort((a: ScheduleItem, b: ScheduleItem) => a.time.localeCompare(b.time));
          setWeeklyPlan(newPlan);
      }
  }, [params.data]);

  // --- HELPER TIME ---
  // Chuyển string "07:30" -> Date Object
  const stringToDate = (timeString: string) => {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      return date;
  };

  // Chuyển Date Object -> string "07:30"
  const dateToString = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event: any, selectedDate: Date | undefined) => {
      if (Platform.OS === 'android') {
          setShowTimePicker(false);
      }
      
      if (selectedDate) {
          setTempDate(selectedDate);
          setFormTime(dateToString(selectedDate));
      }
  };

  const openTimePicker = () => {
      setTempDate(stringToDate(formTime || '07:00')); // Set giờ hiện tại của form vào picker
      setShowTimePicker(true);
  };

  // --- ACTIONS (Giữ nguyên logic cũ, chỉ sửa phần mở modal) ---

  const handleOpenAddPicker = () => setPickerVisible(true);

  const handlePickItem = (item: ScheduleItem) => {
      setPickerVisible(false);
      setIsNew(true);
      setEditingItem({ ...item, instanceId: Math.random().toString() });
      setFormTitle(item.title);
      setFormCal(item.cal.toString());
      setFormTime('07:00'); 
      setEditorVisible(true);
  };

  const handleEditExisting = (item: ScheduleItem) => {
      setIsNew(false);
      setEditingItem(item);
      setFormTitle(item.title);
      setFormCal(Math.abs(item.cal).toString());
      setFormTime(item.time);
      setEditorVisible(true);
  };

  const handleSave = () => {
      // ... (Giữ nguyên logic Save & Sort như bài trước) ...
      if (!formTime || !formCal) { Alert.alert("Lỗi", "Nhập đủ thông tin"); return; }
      const newItem = { ...editingItem, title: formTitle, time: formTime, cal: parseInt(formCal) } as ScheduleItem;
      let dayList = [...weeklyPlan[selectedDay as DayKey]];
      if (!isNew && editingItem) dayList = dayList.filter((i: ScheduleItem) => i.instanceId !== editingItem.instanceId);
      dayList.push(newItem);
      dayList.sort((a: ScheduleItem, b: ScheduleItem) => a.time.localeCompare(b.time));
      setWeeklyPlan({ ...weeklyPlan, [selectedDay as DayKey]: dayList });
      setEditorVisible(false);
  };

  const handleDelete = () => {
      // ... (Giữ nguyên) ...
      if (isNew || !editingItem) return;
      const dayList = weeklyPlan[selectedDay as DayKey].filter((i: ScheduleItem) => i.instanceId !== editingItem.instanceId);
      setWeeklyPlan({ ...weeklyPlan, [selectedDay as DayKey]: dayList });
      setEditorVisible(false);
  };

  // Calculate Summary (Giữ nguyên)
  const currentDayItems: ScheduleItem[] = weeklyPlan[selectedDay as DayKey] || [];
  const realIn = currentDayItems.filter((i: ScheduleItem) => i.type === 'meal').reduce((sum: number, i: ScheduleItem) => sum + Math.abs(i.cal), 0);
  const realOut = currentDayItems.filter((i: ScheduleItem) => i.type === 'workout').reduce((sum: number, i: ScheduleItem) => sum + Math.abs(i.cal), 0);
  const netCal = realIn - realOut;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ... (Header, DayTabs, SummaryCard, TimelineList giữ nguyên code cũ) ... */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Sắp xếp Lịch trình</Text>
        <TouchableOpacity onPress={() => router.replace("/(home)/CalendarScreen")}>
             <Text style={{color: colors.primary, fontWeight: 'bold'}}>Hoàn tất</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.daysContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 16}}>
              {DAYS.map((day) => (
                  <TouchableOpacity 
                    key={day} style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                    onPress={() => setSelectedDay(day)}
                  >
                      <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{DAY_LABELS[day as DayKey]}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
             <View style={styles.summaryCol}>
                 <Text style={styles.summaryLabel}>Nạp vào</Text>
                 <Text style={[styles.realVal, {color: '#2ECC71'}]}>{realIn} / {TARGETS.caloriesIn}</Text>
             </View>
             <View style={styles.verticalLine} />
             <View style={styles.summaryCol}>
                 <Text style={styles.summaryLabel}>Tiêu hao</Text>
                 <Text style={[styles.realVal, {color: '#FF6B6B'}]}>{realOut} / {TARGETS.caloriesOut}</Text>
             </View>
             <View style={styles.verticalLine} />
             <View style={styles.summaryCol}>
                 <Text style={styles.summaryLabel}>Net Calo</Text>
                 <Text style={[styles.realVal, {color: '#333'}]}>{netCal}</Text>
             </View>
          </View>

          <Text style={styles.dateTitle}>Lịch trình {DAY_LABELS[selectedDay as DayKey]}</Text>
          {currentDayItems.map((item: ScheduleItem) => (
              <View key={item.instanceId} style={styles.timelineRow}>
                   <View style={styles.timeColumn}>
                        <Text style={styles.timeText}>{item.time}</Text>
                        <View style={styles.line} />
                    </View>
                    <View style={styles.cardWrapper}>
                        <TouchableOpacity style={styles.activityCard} onPress={() => handleEditExisting(item)}>
                            <View style={[styles.iconBox, { backgroundColor: item.type === 'workout' ? '#FFF0F0' : '#E8F5E9' }]}>
                                <Text style={{fontSize: 20}}>{item.icon}</Text>
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.activityTitle}>{item.title}</Text>
                                <Text style={styles.activitySub}>{item.type === 'workout' ? 'Đốt' : 'Nạp'}: {Math.abs(item.cal)} Kcal</Text>
                            </View>
                            <Ionicons name="settings-outline" size={18} color="#CCC" />
                        </TouchableOpacity>
                    </View>
              </View>
          ))}
          
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddPicker}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
              <Text style={{color: colors.primary, fontWeight: '600', marginLeft: 8}}>Thêm từ Kho đã chọn</Text>
          </TouchableOpacity>
          <View style={{height: 100}} />
      </ScrollView>

      {/* MODAL 1: PICKER (Giữ nguyên) */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                   <View style={styles.modalHeader}>
                       <Text style={styles.modalTitle}>Chọn từ Kho</Text>
                       <TouchableOpacity onPress={() => setPickerVisible(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
                   </View>
                   <ScrollView style={{maxHeight: 300}}>
                      {inventory.map((item) => (
                          <TouchableOpacity key={item.id} style={styles.pickerItem} onPress={() => handlePickItem(item)}>
                              <Text style={{fontSize: 24, marginRight: 12}}>{item.icon}</Text>
                              <View style={{flex: 1}}>
                                  <Text style={styles.pickerTitle}>{item.title}</Text>
                                  <Text style={styles.pickerSub}>{item.type === 'workout' ? 'Tập luyện' : 'Ăn uống'} • {item.cal} Kcal</Text>
                              </View>
                              <Ionicons name="add" size={24} color={colors.primary} />
                          </TouchableOpacity>
                      ))}
                   </ScrollView>
              </View>
          </View>
      </Modal>

      {/* --- MODAL 2: EDITOR (CẬP NHẬT INPUT GIỜ) --- */}
      <Modal visible={editorVisible} animationType="slide" transparent onRequestClose={() => setEditorVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                       <Text style={styles.modalTitle}>{isNew ? "Thêm vào lịch" : "Chỉnh sửa"}</Text>
                       <TouchableOpacity onPress={() => setEditorVisible(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                      {/* Read-only Info */}
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                          <View style={[styles.iconBox, {marginRight: 10, backgroundColor: editingItem?.type === 'workout' ? '#FFF0F0' : '#E8F5E9'}]}>
                              <Text style={{fontSize: 24}}>{editingItem?.icon}</Text>
                          </View>
                          <View style={{flex: 1}}>
                             <Text style={{fontSize: 12, color: '#888', fontWeight: 'bold', textTransform: 'uppercase'}}>
                                 {editingItem?.type === 'workout' ? 'LUYỆN TẬP' : 'DINH DƯỠNG'}
                             </Text>
                             <TextInput 
                                style={{fontSize: 18, fontWeight: 'bold', color: '#333', borderBottomWidth: 1, borderColor: '#EEE'}}
                                value={formTitle} onChangeText={setFormTitle}
                             />
                          </View>
                      </View>

                      {/* --- THAY INPUT BẰNG NÚT CHỌN GIỜ --- */}
                      <Text style={styles.label}>Thời gian thực hiện:</Text>
                      <TouchableOpacity style={styles.timeInputBtn} onPress={openTimePicker}>
                          <Text style={styles.timeInputText}>{formTime}</Text>
                          <Ionicons name="time-outline" size={24} color={colors.primary} />
                      </TouchableOpacity>

                      {/* --- COMPONENT TIME PICKER --- */}
                      {showTimePicker && (
                          <DateTimePicker
                              testID="dateTimePicker"
                              value={tempDate}
                              mode="time"
                              is24Hour={true}
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={handleTimeChange}
                          />
                      )}
                      {/* Nút Done cho iOS Picker */}
                      {showTimePicker && Platform.OS === 'ios' && (
                          <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10}}>
                             <TouchableOpacity style={{backgroundColor: colors.primary, padding: 8, borderRadius: 8}} onPress={() => setShowTimePicker(false)}>
                                <Text style={{color: 'white'}}>Xong</Text>
                             </TouchableOpacity>
                          </View>
                      )}

                      <Text style={styles.label}>{editingItem?.type === 'workout' ? "Calo tiêu hao:" : "Calo nạp vào:"}</Text>
                      <TextInput 
                          style={styles.input} value={formCal} onChangeText={setFormCal} keyboardType="numeric"
                      />
                  </View>

                  <View style={styles.modalFooter}>
                      {!isNew && (
                          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                              <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                          </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                          <Text style={{color: '#FFF', fontWeight: 'bold'}}>Lưu & Sắp xếp</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    // ... (Giữ nguyên các style cũ) ...
    safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    daysContainer: { backgroundColor: '#FFF', paddingBottom: 12 },
    dayTab: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginRight: 8, backgroundColor: '#F5F5F5' },
    dayTabActive: { backgroundColor: colors.primary },
    dayText: { fontWeight: '600', color: '#888' },
    dayTextActive: { color: '#FFF' },
    content: { padding: 20 },
    summaryCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, justifyContent: 'space-between', marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    summaryCol: { alignItems: 'center', flex: 1 },
    summaryLabel: { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' },
    realVal: { fontSize: 16, fontWeight: 'bold' },
    targetVal: { fontSize: 12, color: '#999', marginTop: 2 },
    verticalLine: { width: 1, backgroundColor: '#EEE' },
    dateTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#333' },
    timelineRow: { flexDirection: 'row', marginBottom: 0 },
    timeColumn: { width: 50, alignItems: 'center' },
    timeText: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 8 },
    line: { width: 2, flex: 1, backgroundColor: '#E0E0E0', borderRadius: 1 },
    cardWrapper: { flex: 1, paddingBottom: 20 },
    activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginLeft: 12, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
    iconBox: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    activityTitle: { fontWeight: 'bold', color: '#333' },
    activitySub: { fontSize: 12, color: '#888' },
    addBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, marginLeft: 62 },
    
    // MODAL & FORM STYLES
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#F5F5F5' },
    pickerTitle: { fontWeight: '600', color: '#333' },
    pickerSub: { fontSize: 12, color: '#888' },
    formGroup: { marginBottom: 20 },
    label: { fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#F5F7FA', padding: 14, borderRadius: 12, fontSize: 16, color: '#333' },
    
    // STYLE MỚI CHO TIME BUTTON
    timeInputBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F7FA', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
    timeInputText: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    modalFooter: { flexDirection: 'row', gap: 12 },
    deleteBtn: { padding: 16, backgroundColor: '#FFF0F0', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 16 }
});