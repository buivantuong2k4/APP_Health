import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  View,
} from "react-native";
import { colors } from "../../constants/theme";

// --- TYPE DEFINITIONS ---
type SuggestionItem = {
  id: string;
  title: string;
  icon: string;
  type: string;
  cal: number;
  time?: string;
  desc: string;
};

type CustomItem = {
  id: string;
  title: string;
  cal: number;
  type: string;
  time: string | null;
  category: string | null;
  icon: string;
  isCustom: boolean;
  desc: string | undefined;
};

type AnyItem = SuggestionItem | CustomItem;

// --- DỮ LIỆU GỢI Ý MẪU ---
const AI_SUGGESTIONS = {
  breakfast: [
    {
      id: "ai_bf_1",
      title: "Yến mạch & Quả mọng",
      cal: 350,
      type: "meal",
      icon: "🥣",
      desc: "Giàu chất xơ",
    },
    {
      id: "ai_bf_2",
      title: "Trứng ốp la & Bơ",
      cal: 400,
      type: "meal",
      icon: "🍳",
      desc: "Nhiều Protein",
    },
  ],
  lunch: [
    {
      id: "ai_ln_1",
      title: "Salad Ức gà nướng",
      cal: 450,
      type: "meal",
      icon: "🥗",
      desc: "Low carb",
    },
  ],
  dinner: [
    {
      id: "ai_dn_1",
      title: "Súp bí đỏ hạt sen",
      cal: 300,
      type: "meal",
      icon: "🍲",
      desc: "Dễ tiêu hóa",
    },
  ],
  workout: [
    {
      id: "ai_wk_1",
      title: "Cardio Hiệu suất cao",
      cal: 300,
      time: "30p",
      type: "workout",
      icon: "🏃",
      desc: "Đốt mỡ nhanh",
    },
    {
      id: "ai_wk_2",
      title: "Yoga giãn cơ",
      cal: 150,
      time: "20p",
      type: "workout",
      icon: "🧘",
      desc: "Thư giãn",
    },
  ],
};

const MEAL_CATEGORIES = [
  { id: "breakfast", label: "Sáng" },
  { id: "lunch", label: "Trưa" },
  { id: "dinner", label: "Tối" },
  { id: "snack", label: "Phụ" },
];

export default function RecommendationScreen() {
  const router = useRouter();

  // State quản lý danh sách
  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [loading, setLoading] = useState(false);

  // State Modal
  const [modalVisible, setModalVisible] = useState(false);

  // State Form Thêm Mới
  const [newItemType, setNewItemType] = useState("meal"); // 'meal' | 'workout'
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCal, setNewItemCal] = useState("");
  const [newItemDuration, setNewItemDuration] = useState(""); // Chỉ cho workout
  const [newItemCategory, setNewItemCategory] = useState("breakfast"); // Chỉ cho meal

  // Chọn mặc định
  useEffect(() => {
    const allIds = new Set<string>();
    Object.values(AI_SUGGESTIONS)
      .flat()
      .forEach((item) => allIds.add(item.id));
    setSelectedItems(allIds);
  }, []);

  // Xử lý Thêm món mới
  const handleCreateCustomItem = () => {
    if (!newItemTitle || !newItemCal) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và lượng calo.");
      return;
    }

    if (newItemType === "workout" && !newItemDuration) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập thời gian tập luyện.");
      return;
    }

    const createdItem = {
      id: `custom_${Date.now()}`,
      title: newItemTitle,
      cal: parseInt(newItemCal),
      type: newItemType,
      // Nếu là workout thì lấy duration, meal thì không có time
      time: newItemType === "workout" ? newItemDuration : null,
      // Nếu là meal thì lưu category để xếp lịch
      category: newItemType === "meal" ? newItemCategory : null,
      icon: newItemType === "workout" ? "💪" : "🍽️",
      isCustom: true,
      desc:
        newItemType === "workout"
          ? "Tự tạo"
          : MEAL_CATEGORIES.find((c) => c.id === newItemCategory)?.label,
    };

    setCustomItems([...customItems, createdItem]);
    setSelectedItems(new Set(selectedItems).add(createdItem.id));

    // Reset & Close
    setModalVisible(false);
    setNewItemTitle("");
    setNewItemCal("");
    setNewItemDuration("");
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedItems(newSelection);
  };

  const handleGeneratePlan = () => {
    if (selectedItems.size === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất 1 mục.");
      return;
    }
    setLoading(true);

    // Gom dữ liệu gửi đi
    const allAvailableItems = [
      ...Object.values(AI_SUGGESTIONS).flat(),
      ...customItems,
    ].filter((item) => selectedItems.has(item.id));

    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: "/(home)/WeeklyScheduleScreen",
        params: { data: JSON.stringify(allAvailableItems) },
      });
    }, 800);
  };

  // --- RENDER ITEM CARD (Giữ nguyên Decor đẹp) ---
  const renderItemCard = (item: AnyItem) => {
    const isSelected = selectedItems.has(item.id);
    const isWorkout = item.type === "workout";

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, isSelected && styles.itemCardSelected]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.8}
      >
        {/* Icon Box */}
        <View
          style={[
            styles.iconBox,
            isWorkout ? styles.iconBoxWorkout : styles.iconBoxFood,
          ]}
        >
          <Text style={{ fontSize: 24 }}>{item.icon}</Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.itemTitle, isSelected && { color: colors.primary }]}
          >
            {item.title}{" "}
            {"isCustom" in item && item.isCustom && (
              <Text style={{ fontSize: 10, color: "#F39C12" }}>(Tự thêm)</Text>
            )}
          </Text>

          <View style={styles.metaContainer}>
            {/* Calo Badge */}
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

            {/* Time Badge (Chỉ hiện cho Workout) */}
            {isWorkout && (
              <View style={[styles.metaBadge, { marginLeft: 6 }]}>
                <Ionicons name="time-outline" size={12} color="#666" />
                <Text style={styles.metaText}>{item.time}</Text>
              </View>
            )}

            {/* Desc/Category Badge */}
            {item.desc && (
              <View
                style={[
                  styles.metaBadge,
                  { marginLeft: 6, backgroundColor: "#F0F0F0" },
                ]}
              >
                <Text style={[styles.metaText, { color: "#555" }]}>
                  {item.desc}
                </Text>
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
    );
  };

  const renderSectionHeader = (title: string, icon: string, color: string) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={color}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn Thực Đơn & Bài Tập</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addIconBtn}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.guideText}>
          Dưới đây là các gợi ý từ AI. Bạn có thể chọn hoặc tự thêm món mới bằng
          nút (+) ở góc trên.
        </Text>

        {/* Custom Items Section */}
        {customItems.length > 0 && (
          <>
            <Text style={styles.bigCategoryTitle}>Của Riêng Bạn</Text>
            {customItems.map(renderItemCard)}
            <View style={styles.divider} />
          </>
        )}

        {/* AI Food Sections */}
        <Text style={styles.bigCategoryTitle}>Dinh Dưỡng (AI)</Text>
        {renderSectionHeader("Bữa sáng", "weather-sunset", "#FF9F43")}
        {AI_SUGGESTIONS.breakfast.map(renderItemCard)}

        {renderSectionHeader("Bữa trưa", "weather-sunny", "#FF6B6B")}
        {AI_SUGGESTIONS.lunch.map(renderItemCard)}

        {renderSectionHeader("Bữa tối", "weather-night", "#5F27CD")}
        {AI_SUGGESTIONS.dinner.map(renderItemCard)}

        {/* AI Workout Section */}
        <View style={styles.divider} />
        <Text style={styles.bigCategoryTitle}>Luyện Tập (AI)</Text>
        {renderSectionHeader("Bài tập đề xuất", "dumbbell", "#1DD1A1")}
        {AI_SUGGESTIONS.workout.map(renderItemCard)}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={handleGeneratePlan}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Đang xử lý..." : `Tiếp Tục (${selectedItems.size} mục)`}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFF"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>

      {/* --- MODAL THÊM MÓN/BÀI TẬP --- */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm Mục Mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {/* 1. Chọn Loại (Meal/Workout) */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  newItemType === "meal" && styles.typeBtnActive,
                ]}
                onPress={() => setNewItemType("meal")}
              >
                <Text
                  style={[
                    styles.typeText,
                    newItemType === "meal" && styles.typeTextActive,
                  ]}
                >
                  🍔 Ăn uống
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  newItemType === "workout" && styles.typeBtnActive,
                ]}
                onPress={() => setNewItemType("workout")}
              >
                <Text
                  style={[
                    styles.typeText,
                    newItemType === "workout" && styles.typeTextActive,
                  ]}
                >
                  🏋️ Tập luyện
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Tên Món/Bài tập */}
            <Text style={styles.label}>Tên gọi</Text>
            <TextInput
              style={styles.input}
              placeholder={
                newItemType === "meal"
                  ? "VD: Phở bò, Sinh tố..."
                  : "VD: Chạy bộ, Gym..."
              }
              value={newItemTitle}
              onChangeText={setNewItemTitle}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* 3. Calo (Dynamic Label) */}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {newItemType === "meal" ? "Calo nạp vào" : "Calo tiêu hao"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 300"
                  keyboardType="numeric"
                  value={newItemCal}
                  onChangeText={setNewItemCal}
                />
              </View>

              {/* 4. Thời gian (Chỉ hiện khi là Workout) */}
              {newItemType === "workout" && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Thời gian tập</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 30p"
                    value={newItemDuration}
                    onChangeText={setNewItemDuration}
                  />
                </View>
              )}
            </View>

            {/* 5. Chọn Bữa (Chỉ hiện khi là Meal) */}
            {newItemType === "meal" && (
              <View>
                <Text style={styles.label}>Thuộc bữa nào?</Text>
                <View style={styles.categoryContainer}>
                  {MEAL_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catBtn,
                        newItemCategory === cat.id && styles.catBtnActive,
                      ]}
                      onPress={() => setNewItemCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.catText,
                          newItemCategory === cat.id && styles.catTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              style={styles.btnSave}
              onPress={handleCreateCustomItem}
            >
              <Text style={styles.btnSaveText}>Thêm vào Danh Sách</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  backButton: { padding: 4 },
  addIconBtn: { padding: 4 },

  content: { padding: 20, paddingBottom: 100 },
  guideText: { color: "#666", marginBottom: 20, lineHeight: 20 },

  bigCategoryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#444" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 20 },

  // --- ITEM CARD STYLES ---
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "0A",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconBoxFood: { backgroundColor: "#FFF5E6" },
  iconBoxWorkout: { backgroundColor: "#E0F7FA" },
  itemTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#333",
    marginBottom: 4,
  },

  metaContainer: { flexDirection: "row", flexWrap: "wrap" },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: { fontSize: 11, color: "#666", marginLeft: 4, fontWeight: "500" },

  // --- FOOTER ---
  footer: {
    padding: 20,
    backgroundColor: "#FFF",
    position: "absolute",
    bottom: 0,
    width: "100%",
    borderTopWidth: 1,
    borderColor: "#EEE",
    elevation: 10,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },

  typeSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeText: { fontWeight: "600", color: "#888" },
  typeTextActive: { color: colors.primary, fontWeight: "bold" },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F5F7FA",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
  },

  // Categories Buttons (Chips)
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FFF",
  },
  catBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  catText: { fontSize: 13, color: "#666" },
  catTextActive: { color: colors.primary, fontWeight: "bold" },

  btnSave: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  btnSaveText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
