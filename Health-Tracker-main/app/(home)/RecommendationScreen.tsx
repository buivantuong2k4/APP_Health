import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { colors } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- CẤU HÌNH API ---
const API_URL = "http://10.0.2.2:8000"; 


// --- TYPE DEFINITIONS ---
type SuggestionItem = {
  id: string;
  title: string;
  icon: string;
  type: string;
  cal: number;
  time?: string;
  desc: string;
  isCustom?: boolean; // Optional flag
};

type CustomItem = {
  id: string;
  title: string;
  cal: number;
  type: string;
  time: string | null;
  category: string | null; // 'breakfast', 'lunch'...
  icon: string;
  isCustom: boolean;
  desc: string | undefined;
};

type AnyItem = SuggestionItem | CustomItem;

type BackendResponse = {
    breakfast_options: any[];
    main_dish_options: any[];
    exercise_options: any[];
};

const MEAL_CATEGORIES = [
    { id: 'breakfast', label: 'Sáng' },
    { id: 'lunch', label: 'Trưa' },
    { id: 'dinner', label: 'Tối' },
    { id: 'snack', label: 'Phụ' }
];

export default function RecommendationScreen() {
  const router = useRouter();
//   --- LẤY THÔNG TIN USER TỪ ASYNC STORAGE ---

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

  
  // State quản lý danh sách từ API
  const [suggestions, setSuggestions] = useState({
      breakfast: [] as SuggestionItem[],
      lunch: [] as SuggestionItem[],
      dinner: [] as SuggestionItem[],
      workout: [] as SuggestionItem[]
  });

  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const [customItems, setCustomItems] = useState<CustomItem[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [processing, setProcessing] = useState(false); 

  // State Modal
  const [modalVisible, setModalVisible] = useState(false);
  
  // State Form Thêm Mới
  const [newItemType, setNewItemType] = useState('meal'); 
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCal, setNewItemCal] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('breakfast');

  // --- 1. GỌI API LẤY DỮ LIỆU ---
  useEffect(() => {
    if (user && user.id){
    fetchSuggestions();}
  }, [user]);

  const fetchSuggestions = async () => {
    try {
        console.log("Fetching from:", `${API_URL}/api/selection/suggestions?user_id=${user?.id || 1}`);
        const response = await fetch(`${API_URL}/api/selection/suggestions?user_id=${user?.id || 1}`);
        const data: BackendResponse = await response.json();

        if ((data as any).error) {
            Alert.alert("Lỗi", (data as any).error);
            return;
        }

        const transformData = (list: any[], type: 'meal' | 'workout', defaultIcon: string) => {
            if (!list) return [];
            return list.map(item => ({
                id: item.id.toString(), 
                title: item.name,       
                cal: item.calories || item.calories_burn_30min || 0,
                type: type,
                icon: defaultIcon,      
                time: type === 'workout' ? '30p' : undefined,
                desc: item.reason || (type === 'workout' ? 'Đề xuất tập luyện' : 'Gợi ý dinh dưỡng'),
                isCustom: false
            }));
        };

        const breakfastList = transformData(data.breakfast_options, 'meal', '🥣');
        const mainDishList = transformData(data.main_dish_options, 'meal', '🍲'); 
        const exerciseList = transformData(data.exercise_options, 'workout', '🏃');

        setSuggestions({
            breakfast: breakfastList,
            lunch: mainDishList, 
            dinner: mainDishList, 
            workout: exerciseList
        });

    } catch (error) {
        console.error("Lỗi fetch API:", error);
        Alert.alert("Lỗi kết nối", "Không thể lấy dữ liệu gợi ý từ AI.");
    } finally {
        setLoading(false);
    }
  };


  // --- XỬ LÝ LOGIC UI ---

  const handleCreateCustomItem = () => {
      if (!newItemTitle || !newItemCal) {
          Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và lượng calo.");
          return;
      }

      const createdItem: CustomItem = {
          id: `custom_${Date.now()}`,
          title: newItemTitle,
          cal: parseInt(newItemCal),
          type: newItemType,
          time: newItemType === 'workout' ? (newItemDuration || '30p') : null, 
          category: newItemType === 'meal' ? newItemCategory : null,
          icon: newItemType === 'workout' ? '💪' : '🍽️',
          isCustom: true,
          desc: newItemType === 'workout' ? 'Tự tạo' : MEAL_CATEGORIES.find(c => c.id === newItemCategory)?.label
      };

      setCustomItems([...customItems, createdItem]);
      
      // Tự động tick chọn món vừa tạo
      setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.add(createdItem.id);
          return newSet;
      });
      
      setModalVisible(false);
      // Reset form
      setNewItemTitle('');
      setNewItemCal('');
      setNewItemDuration('');
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };

  // --- [QUAN TRỌNG] HÀM GỬI DỮ LIỆU ĐÃ ĐƯỢC SỬA ---
  const handleGeneratePlan = async () => {
    if (selectedItems.size === 0) {
      Alert.alert("Chưa chọn mục nào", "Vui lòng chọn ít nhất 1 món ăn hoặc bài tập.");
      return;
    }
    setProcessing(true);
    
    // 1. Gộp tất cả item lại để tìm những cái đã chọn
    const allItems: AnyItem[] = [
        ...suggestions.breakfast,
        ...suggestions.lunch,
        ...suggestions.dinner, 
        ...suggestions.workout,
        ...customItems
    ];

    const selectedList: AnyItem[] = [];
    // Dùng Map để lọc trùng ID (do lunch/dinner dùng chung ID)
    const seenIds = new Set(); 
    
    allItems.forEach(item => {
        if (selectedItems.has(item.id) && !seenIds.has(item.id)) {
            selectedList.push(item);
            seenIds.add(item.id);
        }
    });

    // 2. Tách ID DB và Object Custom
    // - ID DB: chỉ cần mảng số [1, 5, 9]
    const foodIds = selectedList.filter(i => i.type === 'meal' && !i.isCustom).map(i => parseInt(i.id));
    const exIds = selectedList.filter(i => i.type === 'workout' && !i.isCustom).map(i => parseInt(i.id));

    // - Custom: cần gửi chi tiết {name, cal, type}
    const customListToSend = selectedList
        .filter(i => i.isCustom)
        .map((i) => {
            const item = i as CustomItem;
            return {
                name: item.title,
                cal: item.cal,
                // Gửi 'category' (breakfast/lunch) vào trường 'type' để Backend biết xếp vào bữa nào
                type: item.type === 'meal' ? (item.category || 'lunch') : 'workout'
            };
        });

    console.log("Sending Payload:", { foodIds, exIds, customListToSend });

    try {
        const response = await fetch(`${API_URL}/api/plan/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user?.id || 1,
                food_ids: foodIds,
                exercise_ids: exIds,
                custom_items: customListToSend // <--- Gửi danh sách custom ở đây
            })
        });

        const planData = await response.json();
        
        if (planData.error) {
            Alert.alert("Lỗi AI", planData.error);
            return;
        }

        router.push({
            pathname: "/(home)/WeeklyScheduleScreen",
            params: { planData: JSON.stringify(planData) } 
        });

    } catch (error) {
        console.log(error);
        Alert.alert("Lỗi", "Không thể tạo bản nháp lịch trình.");
    } finally {
        setProcessing(false);
    }
  };

  // --- RENDER COMPONENT ---
  const renderItemCard = (item: AnyItem) => {
      const isSelected = selectedItems.has(item.id);
      const isWorkout = item.type === 'workout';

      return (
        <TouchableOpacity 
            key={item.id} 
            style={[styles.itemCard, isSelected && styles.itemCardSelected]}
            onPress={() => toggleSelection(item.id)}
            activeOpacity={0.8}
        >
            <View style={[styles.iconBox, isWorkout ? styles.iconBoxWorkout : styles.iconBoxFood]}>
                <Text style={{fontSize: 24}}>{item.icon}</Text>
            </View>

            <View style={{flex: 1}}>
                <Text style={[styles.itemTitle, isSelected && {color: colors.primary}]}>
                    {item.title} {item.isCustom && <Text style={{fontSize: 10, color: '#F39C12'}}>(Tự thêm)</Text>}
                </Text>
                
                <View style={styles.metaContainer}>
                    <View style={styles.metaBadge}>
                        <MaterialCommunityIcons 
                            name={isWorkout ? "fire" : "food-apple"} 
                            size={12} 
                            color={isWorkout ? "#FF6B6B" : "#2ECC71"} 
                        />
                        <Text style={styles.metaText}>
                            {isWorkout ? `Đốt ${item.cal}` : `${item.cal} Kcal`}
                        </Text>
                    </View>

                    {item.time && (
                        <View style={[styles.metaBadge, {marginLeft: 6}]}>
                            <Ionicons name="time-outline" size={12} color="#666" />
                            <Text style={styles.metaText}>{item.time}</Text>
                        </View>
                    )}

                    {item.desc && (
                        <View style={[styles.metaBadge, {marginLeft: 6, backgroundColor: '#F0F0F0'}]}>
                            <Text style={[styles.metaText, {color: '#555'}]} numberOfLines={1}>{item.desc}</Text>
                        </View>
                    )}
                </View>
            </View>

            <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={26} 
                color={isSelected ? colors.primary : "#E0E0E0"} 
            />
        </TouchableOpacity>
      )
  };

  const renderSectionHeader = (title: string, icon: string, color: string) => (
    <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} style={{marginRight: 8}} />
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn Thực Đơn & Bài Tập</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addIconBtn}>
            <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading ? (
          <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{marginTop: 10, color: '#666'}}>Đang tải gợi ý từ AI...</Text>
          </View>
      ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.guideText}>
                Dưới đây là các gợi ý từ AI. Bạn có thể chọn món có sẵn hoặc bấm dấu (+) ở góc để tự thêm món của riêng mình.
            </Text>

            {/* Custom Items */}
            {customItems.length > 0 && (
                <>
                    <Text style={styles.bigCategoryTitle}>Của Riêng Bạn</Text>
                    {customItems.map(renderItemCard)}
                    <View style={styles.divider} />
                </>
            )}

            {/* AI Food Sections */}
            <Text style={styles.bigCategoryTitle}>Dinh Dưỡng (AI)</Text>
            
            {suggestions.breakfast.length > 0 && (
                <>
                    {renderSectionHeader("Bữa sáng", "weather-sunset", "#FF9F43")}
                    {suggestions.breakfast.map(renderItemCard)}
                </>
            )}

            {suggestions.lunch.length > 0 && (
                <>
                    {renderSectionHeader("Bữa trưa & Tối (Món chính)", "food-drumstick", "#FF6B6B")}
                    {suggestions.lunch.map(renderItemCard)}
                </>
            )}

            {/* AI Workout Section */}
            <View style={styles.divider} />
            <Text style={styles.bigCategoryTitle}>Luyện Tập (AI)</Text>
            {suggestions.workout.length > 0 ? (
                <>
                    {renderSectionHeader("Bài tập đề xuất", "dumbbell", "#1DD1A1")}
                    {suggestions.workout.map(renderItemCard)}
                </>
            ) : (
                <Text style={{color:'#999', fontStyle:'italic'}}>Không có bài tập gợi ý phù hợp.</Text>
            )}
            
          </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.btnPrimary, processing && {opacity: 0.7}]} 
            onPress={handleGeneratePlan} 
            disabled={processing || loading}
        >
            {processing ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <>
                    <Text style={styles.btnText}>
                        {`Tạo Lịch (${selectedItems.size} mục)`}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" style={{marginLeft: 8}} />
                </>
            )}
        </TouchableOpacity>
      </View>

      {/* --- MODAL ADD NEW --- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Thêm Mục Mới</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <Ionicons name="close" size={24} color="#999" />
                      </TouchableOpacity>
                  </View>

                  {/* 1. Chọn Loại */}
                  <View style={styles.typeSwitcher}>
                      <TouchableOpacity 
                        style={[styles.typeBtn, newItemType === 'meal' && styles.typeBtnActive]}
                        onPress={() => setNewItemType('meal')}
                      >
                          <Text style={[styles.typeText, newItemType === 'meal' && styles.typeTextActive]}>🍔 Ăn uống</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.typeBtn, newItemType === 'workout' && styles.typeBtnActive]}
                        onPress={() => setNewItemType('workout')}
                      >
                          <Text style={[styles.typeText, newItemType === 'workout' && styles.typeTextActive]}>🏋️ Tập luyện</Text>
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Tên gọi</Text>
                  <TextInput 
                      style={styles.input} 
                      placeholder={newItemType === 'meal' ? "VD: Phở bò..." : "VD: Chạy bộ..."}
                      value={newItemTitle}
                      onChangeText={setNewItemTitle}
                  />

                  <View style={{flexDirection: 'row', gap: 12}}>
                      <View style={{flex: 1}}>
                          <Text style={styles.label}>{newItemType === 'meal' ? "Calo nạp" : "Calo đốt"}</Text>
                          <TextInput 
                              style={styles.input} 
                              placeholder="300" 
                              keyboardType="numeric"
                              value={newItemCal}
                              onChangeText={setNewItemCal}
                          />
                      </View>
                      {newItemType === 'workout' && (
                          <View style={{flex: 1}}>
                              <Text style={styles.label}>Thời gian</Text>
                              <TextInput 
                                  style={styles.input} 
                                  placeholder="30p" 
                                  value={newItemDuration}
                                  onChangeText={setNewItemDuration}
                              />
                          </View>
                      )}
                  </View>

                   {/* Chọn bữa cho món ăn */}
                   {newItemType === 'meal' && (
                      <View>
                          <Text style={styles.label}>Thuộc bữa nào?</Text>
                          <View style={styles.categoryContainer}>
                              {MEAL_CATEGORIES.map(cat => (
                                  <TouchableOpacity 
                                    key={cat.id}
                                    style={[styles.catBtn, newItemCategory === cat.id && styles.catBtnActive]}
                                    onPress={() => setNewItemCategory(cat.id)}
                                  >
                                      <Text style={[styles.catText, newItemCategory === cat.id && styles.catTextActive]}>
                                          {cat.label}
                                      </Text>
                                  </TouchableOpacity>
                              ))}
                          </View>
                      </View>
                   )}

                  <TouchableOpacity style={styles.btnSave} onPress={handleCreateCustomItem}>
                      <Text style={styles.btnSaveText}>Thêm vào Danh Sách</Text>
                  </TouchableOpacity>

              </View>
          </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9F9F9' },
  header: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  backButton: { padding: 4 },
  addIconBtn: { padding: 4 },

  content: { padding: 20, paddingBottom: 100 },
  guideText: { color: '#666', marginBottom: 20, lineHeight: 20 },
  
  bigCategoryTitle: { fontSize: 22, fontWeight: '800', color: '#222', marginTop: 10, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#444' },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 20 },

  itemCard: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
      padding: 12, borderRadius: 16, marginBottom: 12, 
      borderWidth: 1.5, borderColor: 'transparent',
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  itemCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '0A' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconBoxFood: { backgroundColor: '#FFF5E6' },
  iconBoxWorkout: { backgroundColor: '#E0F7FA' },
  itemTitle: { fontWeight: '700', fontSize: 15, color: '#333', marginBottom: 4 },
  
  metaContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, color: '#666', marginLeft: 4, fontWeight: '500' },

  footer: { 
      padding: 20, backgroundColor: '#FFF', position: 'absolute', bottom: 0, width: '100%', 
      borderTopWidth: 1, borderColor: '#EEE', elevation: 10
  },
  btnPrimary: { 
      backgroundColor: colors.primary, padding: 16, borderRadius: 30, 
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
  },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  typeSwitcher: { flexDirection: 'row', backgroundColor: '#F5F5F5', padding: 4, borderRadius: 12, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#FFF', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  typeText: { fontWeight: '600', color: '#888' },
  typeTextActive: { color: colors.primary, fontWeight: 'bold' },

  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#F5F7FA', padding: 14, borderRadius: 12, fontSize: 16, color: '#333', marginBottom: 12 },

  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#EEE', backgroundColor: '#FFF' },
  catBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  catText: { fontSize: 13, color: '#666' },
  catTextActive: { color: colors.primary, fontWeight: 'bold' },

  btnSave: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});