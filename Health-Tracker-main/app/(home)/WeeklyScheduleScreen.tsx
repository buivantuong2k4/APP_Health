import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "../config/api";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import { scheduleWeeklyPlan, registerForPushNotificationsAsync } from "../../services/NotificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// --- CẤU HÌNH API ---
const API_URL = API_BASE_URL;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_LABELS = { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' } as const;
const DAY_MAP_BACKEND = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

// --- TYPE DEFINITIONS ---
type DayKey = typeof DAYS[number];

type ScheduleItem = {
    id: string;
    title: string;
    icon: string;
    type: string; // 'meal' | 'workout'
    cal: number;
    time: string;
    description?: string;
    duration?: string; // Đã thêm trường này để hiện thời gian tập
    instanceId: string;
};

type WeeklyPlanType = {
    [key in DayKey]: ScheduleItem[];
};

export default function WeeklyScheduleScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // STATE USER
    const [user, setUser] = useState<any | null>(null);

    // STATE MỤC TIÊU (TARGETS)
    const [targets, setTargets] = useState<{
        caloriesIn: number;
        caloriesOut: number;
    } | null>(null);

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
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState<ScheduleItem[]>([]);
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
    const [tempDate, setTempDate] = useState(new Date());

    // --- LOAD DỮ LIỆU TỪ AI (PARAMS) ---
    useEffect(() => {
        if (params.planData && user) {
            const initPlan = async () => {
                try {
                    const dataString = typeof params.planData === 'string' ? params.planData : params.planData[0];
                    const aiData = JSON.parse(dataString);

                    const transformedPlan: WeeklyPlanType = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
                    const tempInventory: ScheduleItem[] = [];
                    const addedIds = new Set<string>();

                    // Helper tạo Item
                    const createItem = (source: any, type: 'meal' | 'workout', defaultTime: string, icon: string): ScheduleItem => {
                        // Thêm vào kho (Inventory)
                        if (!addedIds.has(source.id.toString())) {
                            tempInventory.push({
                                id: source.id.toString(),
                                title: source.name,
                                cal: source.cal || source.calories || 0,
                                type: type,
                                icon: icon,
                                time: defaultTime,
                                instanceId: `inv_${source.id}`,
                                // Lấy duration_min nếu có
                                duration: source.duration_min ? `${source.duration_min} phút` : undefined
                            });
                            addedIds.add(source.id.toString());
                        }

                        // Trả về item cho lịch
                        return {
                            id: source.id.toString(),
                            title: source.name,
                            cal: source.cal || source.calories || 0,
                            type: type,
                            icon: icon,
                            time: source.time || defaultTime,
                            instanceId: Math.random().toString(),
                            // Lấy duration_min nếu có
                            duration: source.duration_min ? `${source.duration_min} phút` : undefined
                        };
                    };

                    // Xử lý Meal Plan
                    if (aiData.meal_plan) {
                        Object.keys(aiData.meal_plan).forEach(dayName => {
                            const dayKey = DAY_MAP_BACKEND[dayName as keyof typeof DAY_MAP_BACKEND] as DayKey;
                            if (!dayKey) return;
                            const dayMeals = aiData.meal_plan[dayName];
                            if (dayMeals.breakfast) transformedPlan[dayKey].push(createItem(dayMeals.breakfast, 'meal', '07:00', '🥣'));
                            if (dayMeals.lunch) transformedPlan[dayKey].push(createItem(dayMeals.lunch, 'meal', '12:00', '🍚'));
                            if (dayMeals.dinner) transformedPlan[dayKey].push(createItem(dayMeals.dinner, 'meal', '19:00', '🍲'));
                        });
                    }

                    // Xử lý Workout Plan (Có duration)
                    if (aiData.workout_plan) {
                        Object.keys(aiData.workout_plan).forEach(dayName => {
                            const dayKey = DAY_MAP_BACKEND[dayName as keyof typeof DAY_MAP_BACKEND] as DayKey;
                            if (!dayKey) return;
                            const dayWorkouts = aiData.workout_plan[dayName];
                            if (dayWorkouts.exercises && Array.isArray(dayWorkouts.exercises)) {
                                dayWorkouts.exercises.forEach((ex: any) => {
                                    transformedPlan[dayKey].push(createItem(ex, 'workout', '17:00', '🏃'));
                                });
                            }
                        });
                    }

                    // Sắp xếp theo giờ
                    Object.keys(transformedPlan).forEach(key => {
                        transformedPlan[key as DayKey].sort((a, b) => a.time.localeCompare(b.time));
                    });

                    setWeeklyPlan(transformedPlan);
                    setInventory(tempInventory);

                    // Lấy Target Analysis
                    const token = await AsyncStorage.getItem("auth_token");
                    if (token) {
                        const analysisRes = await axios.get(`${API_URL}/analysis/`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        const latest = analysisRes.data?.metrics?.[0];
                        setTargets({
                            caloriesOut: latest?.daily_burn ?? 500,
                            caloriesIn: latest?.daily_calo ?? 2000,
                        });
                    }
                } catch (e) {
                    console.error("Lỗi parse data:", e);
                    Alert.alert("Lỗi", "Dữ liệu lịch trình không hợp lệ.");
                }
            };
            
            initPlan();
        }
    }, [params.planData, user]);


    // =================================================================
    // --- LOGIC NGÀY THÔNG MINH ---
    // =================================================================

    const getDateForDay = (dayKey: string) => {
        const today = new Date();
        const currentDayIndex = today.getDay(); // 0=Sun, 1=Mon...

        const dayMap: { [key: string]: number } = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
        };

        const targetDayIndex = dayMap[dayKey];

        // Tính khoảng cách
        let distance = targetDayIndex - currentDayIndex;

        // Nếu ngày chọn đã qua trong tuần này (ví dụ nay Thứ 6 chọn Thứ 2), đẩy sang tuần sau
        if (distance < 0) {
            distance += 7;
        }

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        return targetDate.toISOString().split('T')[0];
    };

    const prepareNotificationData = () => {
        const flatList: any[] = [];
        (Object.keys(weeklyPlan) as DayKey[]).forEach((dayKey) => {
            const items = weeklyPlan[dayKey];
            if (items && items.length > 0) {
                const dateString = getDateForDay(dayKey);
                items.forEach(item => {
                    flatList.push({
                        name: item.title,
                        type: item.type === 'workout' ? 'exercise' : 'food',
                        date: dateString,
                        notify_time: item.time.includes(':') && item.time.length === 5 ? item.time + ":00" : item.time
                    });
                });
            }
        });
        return flatList;
    };

    const handleSaveToDatabase = async () => {
        setLoading(true);
        try {
            const hasPermission = await registerForPushNotificationsAsync();
            if (!hasPermission) console.log("User denied notification permission");

            const payload = {
                user_id: user?.id || 1,
                plan_data: weeklyPlan
            };

            const response = await fetch(`${API_URL}/api/plan/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const resJson = await response.json();

            if (resJson.error) {
                Alert.alert("Lỗi lưu trữ", resJson.error);
            } else {
                try {
                    const notificationItems = prepareNotificationData();
                    await scheduleWeeklyPlan(notificationItems);

                    Alert.alert("Thành công", "Đã lưu lịch và cài đặt nhắc nhở!", [
                        { text: "OK", onPress: () => router.replace("/(home)/CalendarScreen") }
                    ]);
                } catch (notifyError) {
                    console.log("Lỗi đặt báo thức:", notifyError);
                    Alert.alert("Thành công", "Đã lưu lịch (nhưng lỗi cài đặt nhắc nhở).");
                }
            }

        } catch (error) {
            console.error("Lỗi mạng:", error);
            Alert.alert("Lỗi mạng", "Không thể kết nối đến máy chủ.");
        } finally {
            setLoading(false);
        }
    };


    // --- HELPER TIME ---
    const stringToDate = (timeString: string) => {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        return date;
    };

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
        setTempDate(stringToDate(formTime || '07:00'));
        setShowTimePicker(true);
    };

    // --- ACTIONS ---
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

    const handleSaveItemLocal = () => {
        if (!formTime || !formCal) { Alert.alert("Lỗi", "Nhập đủ thông tin"); return; }
        const newItem = {
            ...editingItem,
            title: formTitle,
            time: formTime,
            cal: parseInt(formCal)
        } as ScheduleItem;

        let dayList = [...weeklyPlan[selectedDay]];

        if (!isNew && editingItem) {
            dayList = dayList.filter((i) => i.instanceId !== editingItem.instanceId);
        }

        dayList.push(newItem);
        dayList.sort((a, b) => a.time.localeCompare(b.time));

        setWeeklyPlan({ ...weeklyPlan, [selectedDay]: dayList });
        setEditorVisible(false);
    };

    const handleDeleteItemLocal = () => {
        if (isNew || !editingItem) return;
        const dayList = weeklyPlan[selectedDay].filter((i) => i.instanceId !== editingItem.instanceId);
        setWeeklyPlan({ ...weeklyPlan, [selectedDay]: dayList });
        setEditorVisible(false);
    };

    // Calculate Summary
    const currentDayItems: ScheduleItem[] = weeklyPlan[selectedDay] || [];
    const realIn = currentDayItems.filter((i) => i.type === 'meal').reduce((sum, i) => sum + Math.abs(i.cal), 0);
    const realOut = currentDayItems.filter((i) => i.type === 'workout').reduce((sum, i) => sum + Math.abs(i.cal), 0);
    const netCal = realIn - realOut;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Sắp xếp Lịch trình</Text>
                <TouchableOpacity onPress={handleSaveToDatabase} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Hoàn tất</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.daysContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day} style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                            onPress={() => setSelectedDay(day)}
                        >
                            <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{DAY_LABELS[day]}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryCol}>
                        <Text style={styles.summaryLabel}>Nạp vào</Text>
                        <Text style={[styles.realVal, { color: '#2ECC71' }]}>{realIn} / {targets?.caloriesIn || 2000}</Text>
                    </View>
                    <View style={styles.verticalLine} />
                    <View style={styles.summaryCol}>
                        <Text style={styles.summaryLabel}>Tiêu hao</Text>
                        <Text style={[styles.realVal, { color: '#FF6B6B' }]}>{realOut} / {targets?.caloriesOut || 500}</Text>
                    </View>
                    <View style={styles.verticalLine} />
                    <View style={styles.summaryCol}>
                        <Text style={styles.summaryLabel}>Net Calo</Text>
                        <Text style={[styles.realVal, { color: '#333' }]}>{netCal}</Text>
                    </View>
                </View>

                <Text style={styles.dateTitle}>Lịch trình {DAY_LABELS[selectedDay]}</Text>

                {currentDayItems.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>Chưa có hoạt động nào trong ngày này.</Text>
                ) : (
                    currentDayItems.map((item) => (
                        <View key={item.instanceId} style={styles.timelineRow}>
                            <View style={styles.timeColumn}>
                                <Text style={styles.timeText}>{item.time}</Text>
                                <View style={styles.line} />
                            </View>
                            <View style={styles.cardWrapper}>
                                <TouchableOpacity style={styles.activityCard} onPress={() => handleEditExisting(item)}>
                                    <View style={[styles.iconBox, { backgroundColor: item.type === 'workout' ? '#FFF0F0' : '#E8F5E9' }]}>
                                        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.activityTitle}>{item.title}</Text>
                                        
                                        {/* HIỂN THỊ CALO VÀ THỜI GIAN */}
                                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                                            <Text style={styles.activitySub}>
                                                {item.type === 'workout' ? 'Đốt' : 'Nạp'}: {Math.abs(item.cal)} Kcal
                                            </Text>
                                            
                                            {/* HIỂN THỊ PHÚT NẾU CÓ */}
                                            {item.duration && (
                                                <Text style={[styles.activitySub, {marginLeft: 8, color: colors.primary, fontWeight: '500'}]}>
                                                    • ⏱️ {item.duration}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Ionicons name="settings-outline" size={18} color="#CCC" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}

                <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddPicker}>
                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 8 }}>Thêm từ Kho đã chọn</Text>
                </TouchableOpacity>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* MODAL 1: PICKER */}
            <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn từ Kho</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                        </View>
                        {inventory.length > 0 ? (
                            <ScrollView style={{ maxHeight: 300 }}>
                                {inventory.map((item) => (
                                    <TouchableOpacity key={item.instanceId} style={styles.pickerItem} onPress={() => handlePickItem(item)}>
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>{item.icon}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.pickerTitle}>{item.title}</Text>
                                            <Text style={styles.pickerSub}>{item.type === 'workout' ? 'Tập luyện' : 'Ăn uống'} • {item.cal} Kcal</Text>
                                        </View>
                                        <Ionicons name="add" size={24} color={colors.primary} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>Kho trống</Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* MODAL 2: EDITOR */}
            <Modal visible={editorVisible} animationType="slide" transparent onRequestClose={() => setEditorVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isNew ? "Thêm vào lịch" : "Chỉnh sửa"}</Text>
                            <TouchableOpacity onPress={() => setEditorVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            {/* Info Món */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <View style={[styles.iconBox, { marginRight: 10, backgroundColor: editingItem?.type === 'workout' ? '#FFF0F0' : '#E8F5E9' }]}>
                                    <Text style={{ fontSize: 24 }}>{editingItem?.icon}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {editingItem?.type === 'workout' ? 'LUYỆN TẬP' : 'DINH DƯỠNG'}
                                    </Text>
                                    <TextInput
                                        style={{ fontSize: 18, fontWeight: 'bold', color: '#333', borderBottomWidth: 1, borderColor: '#EEE' }}
                                        value={formTitle} onChangeText={setFormTitle}
                                    />
                                </View>
                            </View>

                            {/* Chọn Giờ */}
                            <Text style={styles.label}>Thời gian thực hiện:</Text>
                            <TouchableOpacity style={styles.timeInputBtn} onPress={openTimePicker}>
                                <Text style={styles.timeInputText}>{formTime}</Text>
                                <Ionicons name="time-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>

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
                            {showTimePicker && Platform.OS === 'ios' && (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                                    <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 8, borderRadius: 8 }} onPress={() => setShowTimePicker(false)}>
                                        <Text style={{ color: 'white' }}>Xong</Text>
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
                                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteItemLocal}>
                                    <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItemLocal}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Lưu & Sắp xếp</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    daysContainer: { backgroundColor: '#FFF', paddingBottom: 12, paddingTop: 12 },
    dayTab: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginRight: 8, backgroundColor: '#F5F5F5' },
    dayTabActive: { backgroundColor: colors.primary },
    dayText: { fontWeight: '600', color: '#888' },
    dayTextActive: { color: '#FFF' },
    content: { padding: 20 },
    summaryCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, justifyContent: 'space-between', marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    summaryCol: { alignItems: 'center', flex: 1 },
    summaryLabel: { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' },
    realVal: { fontSize: 16, fontWeight: 'bold' },
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
    addBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, marginLeft: 62, marginTop: 10 },

    // MODAL & FORM STYLES
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
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