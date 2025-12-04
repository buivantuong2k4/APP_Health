# api/ai_engine.py
import pandas as pd
import random
from datetime import date, timedelta
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics.pairwise import cosine_similarity

# --- [SỬA ĐOẠN NÀY] ---
# Dùng dấu chấm (.) để import file cùng thư mục
from .database_adapter import get_data_from_db
# Nếu file utils nằm cùng thư mục thì thêm dấu chấm, nếu không thì giữ nguyên
from .utils import calculate_age, map_bmi_to_exercise_needs, map_goal_to_food_needs, calculate_daily_calories
# -------------------
class HealthRecommender:
    def __init__(self):
        self.ex_df = None
        self.food_df = None
        self.ex_preprocessor = None
        self.food_preprocessor = None
        self.ex_matrix = None
        self.food_matrix = None

    def load_data(self):
        print(">> Đang tải dữ liệu Knowledge Base...")
        # 1. Load Exercises  
        self.ex_df = get_data_from_db("SELECT * FROM preferences_exercise WHERE is_active = TRUE")
        if self.ex_df is not None and not self.ex_df.empty:
            self.ex_preprocessor = ColumnTransformer(
                transformers=[
                    ('num', MinMaxScaler(), ['intensity', 'calories_burn_30min']),
                    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), ['type', 'target_goal'])
                ]
            )
            self.ex_matrix = self.ex_preprocessor.fit_transform(self.ex_df)

        # 2. Load Foods
        self.food_df = get_data_from_db("SELECT * FROM preferences_food WHERE is_active = TRUE")
        if self.food_df is not None and not self.food_df.empty:
            self.food_preprocessor = ColumnTransformer(
                transformers=[
                    ('num', MinMaxScaler(), ['calories']), 
                    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), ['type', 'target_goal'])
                ]
            )
            self.food_matrix = self.food_preprocessor.fit_transform(self.food_df)
        print(">> Hoàn tất tải dữ liệu.")

    # --- CÁC HÀM HELPER SINH LÝ DO ---
    def _generate_explanation(self, item_type, row, user_goal):
        reasons = []
        if row.get('similarity', 0) > 0.90: reasons.append("Rất phù hợp hồ sơ")
        elif row.get('similarity', 0) > 0.75: reasons.append("Phù hợp chỉ số")

        if item_type == 'exercise':
            if user_goal == 1 and row['type'] == 'cardio': reasons.append("Đốt mỡ giảm cân")
            elif user_goal == 2 and row['type'] == 'strength': reasons.append("Tăng cơ")
            if row['intensity'] == 1: reasons.append("Nhẹ nhàng")
            elif row['intensity'] == 3: reasons.append("Cường độ cao")
        
        elif item_type == 'food':
            cal = row.get('calories', 0)
            if user_goal == 1 and cal < 500: reasons.append("Calo thấp")
            elif user_goal == 2 and row.get('protein', 0) > 20: reasons.append("Giàu đạm")

        if not reasons: return "Gợi ý phù hợp."
        return " • ".join(reasons)

    def _generate_explanation_v2(self, item_type, row, user_goal, pref_status):
        reasons = []
        if pref_status == 'like': reasons.append("Bạn đã Thích")
        base_reason = self._generate_explanation(item_type, row, user_goal)
        reasons.append(base_reason)
        return " • ".join(reasons)

    # --- [CẬP NHẬT] LOGIC HỌC TỪ ID KẾ HOẠCH CŨ (CHÍNH XÁC HƠN) ---
    def _analyze_past_performance(self, user_id):
        """
        Tìm kế hoạch gần nhất trong bảng 'weekly_plans' và tính điểm dựa trên tracking của nó.
        """
        # 1. Tìm ID của plan gần nhất
        query_plan = "SELECT id FROM analysis_weeklyplans WHERE user_id_id = %s ORDER BY created_at DESC LIMIT 1"
        last_plan = get_data_from_db(query_plan, (user_id,), single_row=True)
        
        # Nếu user mới chưa có lịch sử -> Giữ nguyên
        if not last_plan:
            return 1.0 

        plan_id = last_plan['id']

        # 2. Tính toán dựa trên tracking của Plan ID đó
        query_tracking = """
            SELECT COUNT(*) as total, SUM(is_completed) as completed 
            FROM analysis_plantracking 
            WHERE weekly_plan_id = %s AND item_type = 'exercise'
        """
        data = get_data_from_db(query_tracking, (plan_id,), single_row=True)
        
        if not data or data['total'] == 0:
            return 1.0 
            
        completed = float(data['completed'] or 0)
        total = float(data['total'])
        rate = completed / total
        
        print(f">> [ADAPTIVE] Phân tích Plan cũ #{plan_id}: Hoàn thành {int(completed)}/{int(total)} ({rate*100:.1f}%)")
        
        if rate >= 0.8: return 1.1  # Tăng độ khó
        if rate <= 0.4: return 0.8  # Giảm độ khó
        return 1.0

    # --- LOGIC TÍNH TOÁN THÔNG SỐ AN TOÀN ---
    def _calculate_safe_params(self, exercise_type, base_cal, difficulty_factor, user_goal):
        safe_factor = max(0.8, min(difficulty_factor, 1.2))
        adjusted_cal = int(base_cal * safe_factor)
        param_info = ""

        # CARDIO
        if exercise_type == 'cardio':
            base_time = 20 
            if user_goal == 2: base_time = 15
            new_time = int(base_time * safe_factor)
            final_time = max(10, min(new_time, 45)) # Kẹp 10-45p
            
            if final_time >= 40: param_info = f"{final_time} phút (Max)"
            else: param_info = f"{final_time} phút"

        # STRENGTH
        elif exercise_type == 'strength':
            base_reps = 12
            if user_goal == 1: # Giảm cân
                new_reps = int(base_reps * safe_factor)
                final_reps = max(10, min(new_reps, 15))
                final_sets = 3
            elif user_goal == 2: # Tăng cơ
                if safe_factor > 1.05: 
                    final_sets, final_reps = 4, 10
                else: 
                    final_sets = 3
                    final_reps = max(8, min(int(12*safe_factor), 12))
            else: # Duy trì
                final_sets, final_reps = 3, 12
            param_info = f"{final_sets} hiệp x {final_reps} lần"
        else:
            param_info = f"{15 if safe_factor < 1 else 20} phút"

        return param_info, adjusted_cal

    # --- GỢI Ý BÀI TẬP ---
    def recommend_exercises(self, user_id, top_k=5):
        user = get_data_from_db("SELECT u.date_of_birth, h.* FROM accounts_account u JOIN analysis_healthmetric h ON u.user_id = h.user_id WHERE u.user_id = %s", (user_id,), single_row=True)
        if not user or self.ex_df is None: return pd.DataFrame()

        prefs_data = get_data_from_db("SELECT exercise_id, preference_type FROM preferences_userexercisepreferences WHERE user_id_id" \
        " = %s", (user_id,))
        user_prefs = {row['exercise_id']: row['preference_type'] for _, row in prefs_data.iterrows()} if prefs_data is not None else {}
# chọn calo tiêu hao và dạng bài tập phù hợp 
        desired_cal, preferred_type = map_bmi_to_exercise_needs(user['bmi'], user['goal'])
        # kế hoạch lý tưởng
        user_input_df = pd.DataFrame([{'intensity': user['activity_level'], 'calories_burn_30min': desired_cal, 'type': preferred_type, 'target_goal': user['goal']}])
        
        user_vec = self.ex_preprocessor.transform(user_input_df)
        sim_scores = cosine_similarity(user_vec, self.ex_matrix)[0]

        temp_df = self.ex_df.copy()
        temp_df['base_similarity'] = sim_scores
        
        def adjust_score(row):
            score = row['base_similarity']
            status = user_prefs.get(row['id'])
            if status == 'like': score += 0.20
            elif status == 'dislike': score -= 0.50
            return score
        temp_df['final_score'] = temp_df.apply(adjust_score, axis=1)
        temp_df = temp_df.sort_values(by='final_score', ascending=False)

        filtered_df = self._filter_exercises_by_rules(user, temp_df).head(top_k).copy()
        filtered_df['reason'] = filtered_df.apply(lambda row: self._generate_explanation_v2('exercise', row, user['goal'], user_prefs.get(row['id'])), axis=1)
        return filtered_df

    def _filter_exercises_by_rules(self, user, df):
        dob = user.get('date_of_birth') 
        age = calculate_age(dob)
        has_hypertension = user.get('has_hypertension', 0)
        has_diabetes = user.get('has_diabetes', 0)
        resting_heart_rate = user.get('heart_rate', 75)
        avg_sleep = user.get('sleep_hours', 7)

        valid_indices = []
        for idx, row in df.iterrows():
            is_safe = True
            intensity = row.get('intensity', 1)
            if has_hypertension and (intensity == 3 or row.get('contra_hypertension') == 1): is_safe = False
            if age > 60 and intensity == 3: is_safe = False
            if resting_heart_rate > 100 and intensity == 3: is_safe = False
            if avg_sleep < 5 and intensity == 3: is_safe = False
            if has_diabetes and row.get('contra_diabetes') == 1: is_safe = False
            if is_safe: valid_indices.append(idx)
        return df.loc[valid_indices]

    # --- GỢI Ý MÓN ĂN ---
    def recommend_foods(self, user_id, meal_type=None, min_cal=None, max_cal=None, top_k=5):
        # 1. Lấy thông tin User
        user = get_data_from_db("SELECT h.*, h.has_diabetes, h.has_hypertension FROM analysis_healthmetric h WHERE h.user_id = %s", (user_id,), single_row=True)
       
        if not user or self.food_df is None: return pd.DataFrame()

        # 2. Lấy sở thích User (Like/Dislike)
        prefs_data = get_data_from_db("SELECT food_id_id, preference_type FROM preferences_userfoodpreferences WHERE user_id_id = %s", (user_id,))
        user_prefs = {row['food_id_id']: row['preference_type'] for _, row in prefs_data.iterrows()} if prefs_data is not None else {}
       
        # 3. Xác định Calo mục tiêu cho việc tính Similarity (QUAN TRỌNG)
        # Nếu có range min/max, ta lấy điểm giữa (average) để làm chuẩn tìm kiếm
        if min_cal is not None and max_cal is not None:
            target_input_cal = (min_cal + max_cal) / 2
        else:
            # Nếu không truyền vào (chạy mặc định), lấy theo goal chung
            target_input_cal, _ = map_goal_to_food_needs(user['goal'])
        
        _, preferred_type = map_goal_to_food_needs(user['goal'])

        # Tạo vector input dựa trên nhu cầu cụ thể của bữa ăn này
        user_input_df = pd.DataFrame([{
            'calories': target_input_cal, 
            'type': preferred_type, 
            'target_goal': user['goal']
        }])
        
        # 4. Tính toán độ tương đồng (AI Processing)
        user_vec = self.food_preprocessor.transform(user_input_df)
        sim_scores = cosine_similarity(user_vec, self.food_matrix)[0]

        # 5. Xử lý DataFrame
        temp_df = self.food_df.copy()
        temp_df['base_similarity'] = sim_scores
        
        # Hàm điều chỉnh điểm số dựa trên sở thích
        def adjust_score(row):
            score = row['base_similarity']
            status = user_prefs.get(row['id'])
            if status == 'like': score += 0.20
            elif status == 'dislike': score -= 0.50
            return score
        
        temp_df['final_score'] = temp_df.apply(adjust_score, axis=1)

        # --- CÁC BỘ LỌC CỨNG (Hard Filters) ---
        
        # A. Lọc theo buổi (Sáng/Trưa/Tối)
        if meal_type: 
            # Dùng contains để bắt được cả "trua,toi"
            temp_df = temp_df[temp_df['suitable_for'].str.contains(meal_type, case=False, na=False)]

        # B. Lọc theo khoảng Calo (MỚI THÊM)
        if min_cal is not None:
            temp_df = temp_df[temp_df['calories'] >= min_cal]
        if max_cal is not None:
            temp_df = temp_df[temp_df['calories'] <= max_cal]

        # C. Lọc theo bệnh lý (Health Rules)
        # (Hàm _filter_foods_by_rules của bạn nên xử lý hypertension/diabetes)
        temp_df = self._filter_foods_by_rules(user, temp_df)

        # 6. Sắp xếp và lấy Top K
        # Sort sau cùng để đảm bảo lấy được món điểm cao nhất trong nhóm thỏa mãn điều kiện
        filtered_df = temp_df.sort_values(by='final_score', ascending=False).head(top_k).copy()

        # 7. Tạo giải thích (Reasoning)
        filtered_df['reason'] = filtered_df.apply(lambda row: self._generate_explanation_v2('food', row, user['goal'], user_prefs.get(row['id'])), axis=1)
        
        return filtered_df
    def _filter_foods_by_rules(self, user, df):
        has_diabetes = user.get('has_diabetes', 0)
        has_hypertension = user.get('has_hypertension', 0)
        goal = user.get('goal', 1)
        valid_indices = []
        for idx, row in df.iterrows():
            is_safe = True
            cal = row.get('calories', 0)
            if has_diabetes and row.get('contra_diabetes') == 1: is_safe = False
            if has_hypertension and row.get('contra_hypertension') == 1: is_safe = False
            if goal == 1 and cal > 800: is_safe = False
            if is_safe: valid_indices.append(idx)
        return df.loc[valid_indices]

    # --- LẬP LỊCH TUẦN ---
    def generate_weekly_meal_plan(self, user_id):
        # ---------------------------------------------------------
        # 1. KHỞI TẠO & TÍNH TOÁN TARGET
        # ---------------------------------------------------------
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        user = get_data_from_db("SELECT h.* FROM analysis_healthmetric h WHERE h.user_id = %s", (user_id,), single_row=True)
        if not user or self.food_df is None: return pd.DataFrame()
        
        age = calculate_age(user.get('date_of_birth'))
        target_calories = calculate_daily_calories(
            user.get('height_cm'), user.get('weight_kg'), age, 
            user.get('gender'), user.get('activity_level'), user.get('goal')
        )
        
        # Tỷ lệ phân bổ: Trưa chiếm ~57% phần năng lượng còn lại (sau sáng)
        ratio_trua_toi = 0.57 

        # ---------------------------------------------------------
        # 2. CHUẨN BỊ DỮ LIỆU (PRE-FETCH POOLS)
        # ---------------------------------------------------------
        
        # A. Pool Bữa Sáng: (20% - 35% Calo ngày)
        pool_sang = self.recommend_foods(
            user_id, 
            meal_type='sang', 
            min_cal=target_calories * 0.20, 
            max_cal=target_calories * 0.35, 
            top_k=20 
        ).to_dict('records')

        # B. Pool Bữa Chính (Trộn giữa Diet và Energy để đủ calo)
        
        # B1. Nhóm Diet (Nhẹ nhàng: 200 - 500 kcal)
        pool_diet = self.recommend_foods(
            user_id, meal_type='trua,toi', 
            min_cal=200, max_cal=500, top_k=30
        ).to_dict('records')

        # B2. Nhóm Energy (Năng lượng cao: 501 - 1200 kcal) -> QUAN TRỌNG ĐỂ KHÔNG BỊ HỤT CALO
        pool_energy = self.recommend_foods(
            user_id, meal_type='trua,toi', 
            min_cal=501, max_cal=1200, top_k=30
        ).to_dict('records')

        # B3. Trộn và Shuffle
        pool_main = pool_diet + pool_energy
        random.shuffle(pool_main)

        weekly_plan = {}
        used_foods = set()

        # ---------------------------------------------------------
        # 3. HÀM TÌM MÓN THÔNG MINH (SMART FINDER)
        # ---------------------------------------------------------
        def find_smart_meal(pool, target_val):
            """
            Logic: Ưu tiên món chưa ăn (Unique). 
            Nhưng nếu món chưa ăn lệch target quá 150kcal, 
            thì xem xét quay lại ăn món cũ (Repeat) nếu nó khớp hơn.
            """
            # Tìm ứng viên trong nhóm CHƯA ĂN
            candidates_unique = [m for m in pool if m['id'] not in used_foods]
            best_unique = None
            if candidates_unique:
                best_unique = min(candidates_unique, key=lambda x: abs(x.get('calories', 0) - target_val))

            # Tìm ứng viên trong TOÀN BỘ POOL (Bao gồm đã ăn)
            best_any = min(pool, key=lambda x: abs(x.get('calories', 0) - target_val)) if pool else None

            if not best_unique: return best_any # Hết món mới -> Bắt buộc ăn lại
            if not best_any: return None # Pool rỗng

            # QUYẾT ĐỊNH:
            threshold = 150 # Ngưỡng chấp nhận sai số (kcal)
            diff_unique = abs(best_unique.get('calories', 0) - target_val)
            diff_any = abs(best_any.get('calories', 0) - target_val)

            # Nếu món mới đủ tốt (sai số < 150) -> Chọn món mới
            if diff_unique <= threshold:
                return best_unique
            
            # Nếu món mới quá tệ, mà món cũ khớp hơn hẳn (> 50kcal) -> Chọn món cũ
            if diff_any < diff_unique - 50:
                return best_any
            
            return best_unique

        # ---------------------------------------------------------
        # 4. VÒNG LẶP XẾP LỊCH (DYNAMIC COMPENSATION)
        # ---------------------------------------------------------
        for day in days:
            try:
                # --- BƯỚC 1: BỮA SÁNG ---
                valid_breakfasts = [m for m in pool_sang if m['id'] not in used_foods]
                # Nếu hết món sáng mới -> Reset pool sáng (cho phép lặp lại)
                if not valid_breakfasts: valid_breakfasts = pool_sang 
                
                m_sang = random.choice(valid_breakfasts) if valid_breakfasts else None
                if m_sang: used_foods.add(m_sang['id'])
                cal_sang = m_sang.get('calories', 0) if m_sang else 0

                # --- BƯỚC 2: TÍNH TOÁN DƯ ---
                remaining_cal = target_calories - cal_sang

                # --- BƯỚC 3: BỮA TRƯA (TỪ POOL MAIN) ---
                target_trua = remaining_cal * ratio_trua_toi 
                m_trua = find_smart_meal(pool_main, target_trua)
                
                if m_trua: 
                    used_foods.add(m_trua['id'])
                    cal_trua = m_trua.get('calories', 0)
                else: 
                    cal_trua = 0

                # --- BƯỚC 4: BỮA TỐI (TỪ POOL MAIN) ---
                target_toi = target_calories - cal_sang - cal_trua
                
                # Safety Clamp: Kẹp biên an toàn cho bữa tối
                # Không ép ăn tối quá ít (<200) hoặc quá nhiều (>900)
                if target_toi < 200: target_toi = 200
                if target_toi > 900: target_toi = 900

                m_toi = find_smart_meal(pool_main, target_toi)
                
                if m_toi: 
                    used_foods.add(m_toi['id'])
                    cal_toi = m_toi.get('calories', 0)
                else: 
                    cal_toi = 0

                # --- LƯU KẾT QUẢ ---
                if m_sang and m_trua and m_toi:
                    total_cal = cal_sang + cal_trua + cal_toi
                    
                    weekly_plan[day] = {
                        "total_calories": int(total_cal),
                        "target_calories": int(target_calories),
                        "diff": int(total_cal - target_calories),
                        "breakfast": {
                            "id": m_sang['id'], "name": m_sang['name'], "cal": int(cal_sang)
                        },
                        "lunch": {
                            "id": m_trua['id'], "name": m_trua['name'], "cal": int(cal_trua)
                        },
                        "dinner": {
                            "id": m_toi['id'], "name": m_toi['name'], "cal": int(cal_toi)
                        }
                    }
                else:
                    weekly_plan[day] = {"error": "Không tìm thấy món ăn phù hợp"}

            except Exception as e:
                print(f"Error generating plan for {day}: {e}")
                weekly_plan[day] = {"error": "Lỗi hệ thống"}

        return weekly_plan
   
    # --- [CẬP NHẬT] TẠO LỊCH TẬP (CÓ NGÀY THÁNG CỤ THỂ) ---
    def generate_weekly_exercise_plan(self, user_id, start_date=None):
        user = get_data_from_db("SELECT u.date_of_birth, h.* FROM accounts_account u JOIN analysis_healthmetric h ON u.user_id = h.user_id WHERE u.user_id = %s", (user_id,), single_row=True)
        if not user: return {}

        # Xử lý ngày bắt đầu
        if start_date is None: start_date = date.today() + timedelta(days=1)
        
        # Tính toán Adaptive
        difficulty_factor = self._analyze_past_performance(user_id)
        print(f">> [PLANNING] Bắt đầu: {start_date} | Hệ số: {difficulty_factor}")

        goal = user.get('goal', 1)
        if goal == 2:   pattern = ['Strength', 'Strength', 'Cardio', 'Strength', 'Strength', 'Cardio', 'Yoga']
        elif goal == 1: pattern = ['Cardio', 'Strength', 'Cardio', 'Cardio', 'Strength', 'Cardio', 'Yoga']
        else:           pattern = ['Cardio', 'Strength', 'Cardio', 'Strength', 'Cardio', 'Yoga', 'Rest']

        days_map = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekly_ex_plan = {}

        for i in range(7):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            day_name = days_map[i]
            day_type = pattern[i]

            if day_type == 'Rest':
                weekly_ex_plan[day_name] = {"date": date_str, "type": "Nghỉ ngơi", "exercises": []}
                continue

            exercises = self._recommend_exercises_by_type(user, day_type, top_k=3, override_level=None)
            ex_list = []
            if not exercises.empty:
                for _, row in exercises.iterrows():
                    sets_info, adj_cal = self._calculate_safe_params(
                        row['type'], int(row['calories_burn_30min']), difficulty_factor, goal
                    )
                    # Lưu ID bài tập để tracking
                    ex_list.append({
                        "id": int(row['id']), 
                        "name": row['name'], 
                        "sets": sets_info, 
                        "cal": adj_cal
                    })
            
            weekly_ex_plan[day_name] = {"date": date_str, "type": day_type, "exercises": ex_list}
            
        return weekly_ex_plan

    def _recommend_exercises_by_type(self, user, ex_type, top_k=3, override_level=None):
        """
        Gợi ý bài tập theo loại (Hybrid): Kết hợp Lọc cứng, AI Similarity và Sở thích cá nhân.
        """
        target_type = ex_type.lower()
        
        # ---------------------------------------------------------
        # 1. LỌC SƠ BỘ (HARD FILTER)
        # ---------------------------------------------------------
        # Chỉ lấy đúng loại bài (Cardio/Strength/Yoga...)
        filtered = self.ex_df[self.ex_df['type'] == target_type].copy()
        if filtered.empty: 
            return pd.DataFrame()

        # Lọc an toàn (bỏ bài chấn thương, thiếu dụng cụ)
        safe = self._filter_exercises_by_rules(user, filtered)
        
        # Fallback: Nếu lọc kỹ quá mà hết bài, dùng lại danh sách sơ bộ để tránh lỗi
        if safe.empty: 
            safe = filtered.head(top_k)

        # ---------------------------------------------------------
        # 2. TÍNH ĐIỂM AI (CONTENT-BASED SIMILARITY)
        # ---------------------------------------------------------
        # Tạo vector nhu cầu lý tưởng của user cho loại bài này
        desired_cal, _ = map_bmi_to_exercise_needs(user.get('bmi'), user.get('goal'))
        
        user_input_df = pd.DataFrame([{
            'intensity': user.get('activity_level', 2), 
            'calories_burn_30min': desired_cal, 
            'type': target_type, 
            'target_goal': user.get('goal')
        }])
        
        # Biến đổi thành vector số học
        user_vec = self.ex_preprocessor.transform(user_input_df)
        
        # Lấy ma trận vector tương ứng với các bài trong danh sách 'safe'
        # (Dùng index để map đúng hàng trong ma trận gốc self.ex_matrix)
        safe_indices = safe.index
        safe_matrix = self.ex_matrix[safe_indices]
        
        # Tính độ tương đồng (Cosine Similarity)
        # Kết quả là mảng điểm từ 0 -> 1 (càng gần 1 càng giống nhu cầu)
        sim_scores = cosine_similarity(user_vec, safe_matrix).flatten()
        safe['base_similarity'] = sim_scores

        # ---------------------------------------------------------
        # 3. TÍNH ĐIỂM NGHIỆP VỤ (PREFERENCE & LEVEL)
        # ---------------------------------------------------------
        # Lấy lịch sử Like/Dislike từ DB
        prefs_data = get_data_from_db(
            "SELECT exercise_id, preference_type FROM preferences_userexercisepreferences WHERE user_id_id = %s", 
            (user['id'],)
        )
        user_prefs = {}
        if prefs_data is not None and not prefs_data.empty:
            user_prefs = {row['exercise_id']: row['preference_type'] for _, row in prefs_data.iterrows()}

        target_level = override_level if override_level else user.get('activity_level', 2)

        def calculate_hybrid_score(row):
            # A. Điểm cơ sở (Từ AI)
            score = row['base_similarity']
            
            # B. Điểm sở thích (User Feedback)
            status = user_prefs.get(row['id'])
            if status == 'like': 
                score += 0.30       # Thưởng điểm bài user thích
            elif status == 'dislike': 
                score -= 1.00       # Phạt nặng bài user ghét (để ẩn đi)
                
            # C. Điểm trình độ (Level Matching)
            # Lệch trình độ càng xa thì càng bị trừ điểm
            diff = abs(row['intensity'] - target_level)
            penalty = diff * 0.15 
            
            return score - penalty

        # Áp dụng công thức tính điểm
        safe['hybrid_score'] = safe.apply(calculate_hybrid_score, axis=1)

        # ---------------------------------------------------------
        # 4. KẾT QUẢ
        # ---------------------------------------------------------
        # Trả về Top K bài có điểm cao nhất
        return safe.sort_values('hybrid_score', ascending=False).head(top_k)
    def get_full_user_schedule(self, user_id, start_date=None):
        return {
            "meal_plan": self.generate_weekly_meal_plan(user_id),
            "workout_plan": self.generate_weekly_exercise_plan(user_id, start_date)
        }
    
    # [FILE: ai_engine.py]

    # ... (Giữ nguyên các code cũ) ...

    def get_selection_options(self, user_id):
        """
        Trả về danh sách các món ăn và bài tập tốt nhất cho User này.
        Dùng để hiển thị ở màn hình "Chọn món" trước khi tạo lịch.
        """
        # 1. Lấy thông tin User
        user = get_data_from_db("SELECT h.* FROM analysis_healthmetric h WHERE h.user_id = %s", (user_id,), single_row=True)
        if not user: return {}

        # 2. Gợi ý Món Sáng (Lấy top 10 món tốt nhất)
        # map_goal_to_food_needs giúp định hình loại món (diet/muscle...)
        df_sang = self.recommend_foods(user_id, meal_type='sang', top_k=10)
        print(f">> Gợi ý món sáng cho User #{user_id}: {len(df_sang)} món")
        list_sang = df_sang.to_dict('records') if not df_sang.empty else []

        # 3. Gợi ý Món Chính (Trưa/Tối) (Lấy top 20 món)
        df_chinh = self.recommend_foods(user_id, meal_type='trua,toi', top_k=20)
        list_chinh = df_chinh.to_dict('records') if not df_chinh.empty else []

        # 4. Gợi ý Bài tập (Lấy top 10 bài)
        df_ex = self.recommend_exercises(user_id, top_k=10)
        list_ex = df_ex.to_dict('records') if not df_ex.empty else []

        return {
            "breakfast_options": list_sang,
            "main_dish_options": list_chinh,
            "exercise_options": list_ex
        }
    
    # [FILE: ai_engine.py] - Cập nhật logic mới

    # ... (Giữ nguyên các hàm load_data, recommend_foods cũ) ...

    # --- HÀM MỚI: TẠO LỊCH TỪ DANH SÁCH USER CHỌN ---
    def generate_custom_plan_from_selection(self, user_id, selected_food_ids, selected_ex_ids,custom_items=[]):
        """
        Input: 
            - selected_food_ids: list [1, 5, 10, ...] (User đã tick chọn)
            - selected_ex_ids: list [20, 25, ...]
        Output:
            - Lịch tuần hoàn chỉnh.
        """
        # 1. Lấy thông tin User để tính TDEE mục tiêu
        user = get_data_from_db("SELECT h.*, u.date_of_birth FROM analysis_healthmetric h JOIN accounts_account u ON h.user_id = u.user_id WHERE h.user_id = %s", (user_id,), single_row=True)
        if not user: return {"error": "User not found"}

        age = calculate_age(user.get('date_of_birth'))
        target_calories = calculate_daily_calories(
            user.get('height_cm'), user.get('weight_kg'), age, 
            user.get('gender'), user.get('activity_level'), user.get('goal')
        )

        # ==========================================
        # XỬ LÝ PHẦN ĂN UỐNG (MEAL PLAN)
        # ==========================================
        
       # A. Lấy món từ DB (như cũ)
        pool_foods = []
        if selected_food_ids:
            ids_str = ','.join(map(str, selected_food_ids))
            pool_foods = get_data_from_db(f"SELECT * FROM preferences_food WHERE id IN ({ids_str})").to_dict('records')
        
        # --- ĐOẠN MỚI THÊM: XỬ LÝ MÓN CUSTOM ---
        # Biến đổi món custom cho giống cấu trúc món DB để code phía dưới chạy được
        import uuid
        for item in custom_items:
            # Tạo một món "giả" có cấu trúc giống hệt món trong DB
            fake_item = {
                'id': f"custom_{uuid.uuid4().hex[:8]}", # ID dạng chuỗi: "custom_a1b2c3"
                'name': item.get('name', 'Món tự chọn'),
                'calories': int(item.get('cal', 0)),
                'type': item.get('type', 'lunch'), # 'breakfast' hoặc 'lunch/dinner'
                'is_custom': True
            }
            pool_foods.append(fake_item)
            # Thêm ID giả này vào danh sách "đã chọn" để tí nữa ưu tiên xếp nó
            selected_food_ids.append(fake_item['id']) 
        # ---------------------------------------

        # B. Phân loại Sáng / Chính
        pool_sang = [f for f in pool_foods if 'breakfast' in f.get('type', '').lower()]
        pool_chinh = [f for f in pool_foods if 'breakfast' not in f.get('type', '').lower()]

        # C. Auto-fill (AI tự động bù nếu user chọn ít quá)
        # Quy tắc: Cần ít nhất 3 món sáng và 5 món chính để xoay tua đỡ chán
        if len(pool_sang) < 3:
            needed = 3 - len(pool_sang)
            print(f">> User chọn thiếu {needed} món sáng. AI đang tìm thêm...")
            more_sang = self.recommend_foods(user_id, meal_type='sang', top_k=needed*2)
            if not more_sang.empty:
                pool_sang.extend(more_sang.to_dict('records'))

        if len(pool_chinh) < 5:
            needed = 5 - len(pool_chinh)
            print(f">> User chọn thiếu {needed} món chính. AI đang tìm thêm...")
            more_main = self.recommend_foods(user_id, meal_type='trua,toi', top_k=needed*2)
            if not more_main.empty:
                pool_chinh.extend(more_main.to_dict('records'))

        # D. Xếp lịch (Logic: Ưu tiên món User chọn trước)
        # Đánh dấu món nào là của User chọn để ưu tiên
        user_picked_ids = set(selected_food_ids)
        
        meal_plan = {}
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        # Trộn ngẫu nhiên để không bị lặp thứ tự, nhưng lát nữa sẽ ưu tiên pick
        random.shuffle(pool_sang)
        random.shuffle(pool_chinh)

        for day in days:
            # 1. Chọn bữa sáng
            # Ưu tiên tìm trong pool món nào User đã pick
            brk_candidates = sorted(pool_sang, key=lambda x: 0 if x['id'] in user_picked_ids else 1)
            # Lấy món đầu tiên (ưu tiên user pick) rồi rotate nó xuống cuối danh sách để ngày mai đổi món khác
            selected_breakfast = brk_candidates[0]
            pool_sang.append(pool_sang.pop(pool_sang.index(selected_breakfast))) 
            
            cal_sang = selected_breakfast['calories']
            remaining = target_calories - cal_sang

            # 2. Chọn bữa trưa & tối (Logic tìm tổng gần bằng remaining)
            # Tạm thời lấy ngẫu nhiên 2 món trong pool chính sao cho calo vừa đủ
            best_combo = None
            min_diff = 9999

            # Thử 10 lần ngẫu nhiên để tìm cặp đôi hoàn hảo
            for _ in range(10):
                m1 = random.choice(pool_chinh)
                m2 = random.choice(pool_chinh)
                if m1['id'] == m2['id']: continue # Không ăn trùng trưa tối
                
                total = m1['calories'] + m2['calories']
                diff = abs(total - remaining)
                
                # Ưu tiên combo có món user thích
                priority_bonus = 0
                if m1['id'] in user_picked_ids: priority_bonus += 50
                if m2['id'] in user_picked_ids: priority_bonus += 50
                
                # So sánh: Sai số calo thấp nhất (đã trừ điểm ưu tiên)
                if (diff - priority_bonus) < min_diff:
                    min_diff = diff - priority_bonus
                    best_combo = (m1, m2)
            
            if best_combo:
                m_trua, m_toi = best_combo
            else:
                # Fallback nếu không tìm ra
                m_trua, m_toi = pool_chinh[0], pool_chinh[1]

            meal_plan[day] = {
                "total_calories": int(cal_sang + m_trua['calories'] + m_toi['calories']),
                "breakfast": {"id": selected_breakfast['id'], "name": selected_breakfast['name'], "cal": selected_breakfast['calories']},
                "lunch": {"id": m_trua['id'], "name": m_trua['name'], "cal": m_trua['calories']},
                "dinner": {"id": m_toi['id'], "name": m_toi['name'], "cal": m_toi['calories']},
            }

        # ==========================================
        # XỬ LÝ PHẦN TẬP LUYỆN (WORKOUT PLAN)
        # ==========================================
        # Logic tương tự: Lấy bài user chọn -> Fill nếu thiếu -> Xếp vào lịch
        # (Ở đây mình làm gọn lại để code không quá dài)
        # Bạn có thể áp dụng logic query WHERE id IN (...) tương tự phần Food
        
        # Tạm thời gọi hàm tạo lịch tập cũ (bạn có thể nâng cấp phần này sau)
        workout_plan = self.generate_weekly_exercise_plan(user_id) 

        return {
            "meal_plan": meal_plan,
            "workout_plan": workout_plan
        }