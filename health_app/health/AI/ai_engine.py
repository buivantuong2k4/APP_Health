# api/ai_engine.py
import pandas as pd
import random
from datetime import date, timedelta
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics.pairwise import cosine_similarity
import uuid

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
    # Load dữ liệu bài tập và món ăn từ DB rồi chuẩn hóa/mã hóa để tạo ma trận phục vụ gợi ý
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
    # lý do theo điểm tương đồng và mục tiêu
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
#   lý do vì thích (mới thêm)
    def _generate_explanation_v2(self, item_type, row, user_goal, pref_status):
        reasons = []
        if pref_status == 'like': reasons.append("Bạn đã Thích")
        base_reason = self._generate_explanation(item_type, row, user_goal)
        reasons.append(base_reason)
        return " • ".join(reasons)

   # Phân tích mức độ hoàn thành plan gần nhất của user để scale độ khó (tăng/giảm) cho gợi ý mới
    def _analyze_past_performance(self, user_id):
       
        # 1. Tìm ID của plan gần nhất
        query_plan = "SELECT id FROM analysis_weeklyplans WHERE user_id_id = %s ORDER BY created_at DESC LIMIT 1"
        last_plan = get_data_from_db(query_plan, (user_id,), single_row=True)
        
        # Nếu user mới chưa có lịch sử -> Giữ nguyên
        if not last_plan:
            return 1.0 

        plan_id = last_plan['id']

        # 2. Tính toán dựa trên bảng  tracking của Plan ID đó
        query_tracking = """
            SELECT COUNT(*) as total, SUM(is_completed) as completed 
            FROM analysis_plantracking 
            WHERE weekly_plan_id = %s AND item_type = 'exercise'
        """
        data = get_data_from_db(query_tracking, (plan_id,), single_row=True)
        
        if not data or data['total'] == 0:
            return 1.0 
            # tính mức độ hoàn thành lịch của tuần trước đó
        completed = float(data['completed'] or 0)
        total = float(data['total'])
        rate = completed / total
        
        print(f">> [ADAPTIVE] Phân tích Plan cũ #{plan_id}: Hoàn thành {int(completed)}/{int(total)} ({rate*100:.1f}%)")
        
        if rate >= 0.8: return 1.1  # Tăng độ khó
        if rate <= 0.4: return 0.8  # Giảm độ khó
        return 1.0

   # Lọc danh sách bài tập theo các rule an toàn (tuổi, bệnh lý, nhịp tim, giấc ngủ) để loại bỏ bài tập rủi ro
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

    # Gợi ý danh sách món ăn Top K cho user dựa trên calo mục tiêu, sở thích, bệnh lý và độ tương đồng món
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
            target_input_cal = 600
        
        preferred_type = map_goal_to_food_needs(user['goal'])

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
    
    # Lọc món ăn theo bệnh lý & mục tiêu (tiểu đường, huyết áp, calo tối đa cho giảm cân)
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

  
    # Sinh lịch tập 7 ngày cho user, ưu tiên bài đã chọn, auto-fill thêm và phân bổ bài để gần đạt mục tiêu calo/ngày
    def generate_weekly_exercise_plan(self, user_id, start_date=None, selected_ex_ids=None):
        """
        Sinh kế hoạch tập 7 ngày.

        - Nếu selected_ex_ids có dữ liệu: ưu tiên dùng bài user đã chọn.
        - Nếu selected_ex_ids ít hoặc rỗng: tự động lấy thêm bài phù hợp từ DB.
        - Mỗi ngày cố gắng đốt ≈ target_ex_cal (calo tiêu hao mục tiêu).
        """

        # --------------------------------------------------
        # 1. LẤY THÔNG TIN USER
        # --------------------------------------------------
        user = get_data_from_db(
            """
            SELECT u.date_of_birth, h.* 
            FROM accounts_account u 
            JOIN analysis_healthmetric h ON u.user_id = h.user_id 
            WHERE u.user_id = %s
            """,
            (user_id,),
            single_row=True
        )
        if not user:
            return {}

        # --------------------------------------------------
        # 2. XÁC ĐỊNH TARGET CALO TIÊU HAO / NGÀY
        #    (SỬA TÊN CỘT CHO KHỚP DB CỦA BẠN)
        # --------------------------------------------------
        target_ex_cal = (
            user.get('daily_burn')  # nếu bạn có cột này
          
        )

        if not target_ex_cal:
            # Nếu không có cột riêng -> lấy khoảng 25–30% tổng calo/ngày
            daily_calo = user.get('daily_calo') or user.get('target_calories')
            if daily_calo:
                target_ex_cal = int(float(daily_calo) * 0.3)
            else:
                target_ex_cal = 300

        target_ex_cal = int(target_ex_cal)

        # --------------------------------------------------
        # 3. NGÀY BẮT ĐẦU + HỆ SỐ ĐỘ KHÓ
        # --------------------------------------------------
        if start_date is None:
            start_date = date.today() + timedelta(days=1)

        difficulty_factor = self._analyze_past_performance(user_id)
        print(f"[EX-PLAN] start={start_date} | factor={difficulty_factor} | target_ex_cal={target_ex_cal}")

        days_map = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekly_ex_plan = {}

        # --------------------------------------------------
        # 4. HÀM PHỤ SCALE THỜI GIAN ĐỂ FIT CALO
        # --------------------------------------------------
        def scale_duration(cal_30, target_cal, min_min=5, max_min=60):
            """
            cal_30: calo/30 phút
            target_cal: muốn đốt bao nhiêu cal
            -> trả về (duration_phút, calo_thực_tế)
            """
            if cal_30 <= 0 or target_cal <= 0:
                return 0, 0
            raw_duration = 30.0 * (float(target_cal) / float(cal_30))
            raw_duration = max(min_min, min(max_min, raw_duration))
            scaled_cal = int(cal_30 * (raw_duration / 30.0))
            return round(raw_duration, 1), scaled_cal

        # --------------------------------------------------
        # 5. LẤY POOL BÀI TẬP TỪ USER CHỌN + AUTO-FILL NẾU THIẾU
        # --------------------------------------------------
        pool_ex = []

        # 5.1. Lấy từ selected_ex_ids (bài user chọn)
        if selected_ex_ids:
            ex_ids = [eid for eid in selected_ex_ids if str(eid).isdigit()]
            if ex_ids:
                ids_str = ",".join(map(str, ex_ids))
                ex_df = get_data_from_db(
                    f"SELECT * FROM preferences_exercise WHERE id IN ({ids_str})"
                )
                if ex_df is not None and not ex_df.empty:
                    pool_ex = ex_df.to_dict('records')

        # 5.2. Nếu user không chọn gì HOẶC chọn quá ít -> tự gợi ý thêm theo goal
        MIN_EX = 5  # tối thiểu 5 bài để xoay tua

        if len(pool_ex) < MIN_EX:
            needed = MIN_EX - len(pool_ex)
            print(f"[EX-PLAN] User chọn {len(pool_ex)} bài. Auto-fill thêm {needed} bài...")

            # Lấy goal để chọn loại bài phù hợp
            goal = user.get('goal', 1)
            if goal == 1:       # Giảm cân: ưu tiên Cardio, rồi Strength
                preferred_types = ['Cardio', 'Strength']
            elif goal == 2:     # Tăng cơ: ưu tiên Strength, rồi Cardio
                preferred_types = ['Strength', 'Cardio']
            else:               # Duy trì / thư giãn: Cardio + Yoga
                preferred_types = ['Cardio', 'Yoga']

            more_ex = []
            for ex_type in preferred_types:
                rec_df = self._recommend_exercises_by_type(
                    user=user,
                    ex_type=ex_type,
                    top_k=needed * 3,
                    override_level=None
                )
                if rec_df is not None and not rec_df.empty:
                    more_ex.extend(rec_df.to_dict('records'))

            # Gộp lại, tránh trùng id
            existing_ids = {int(ex['id']) for ex in pool_ex if str(ex.get('id', '')).isdigit()}
            for ex in more_ex:
                try:
                    ex_id = int(ex['id'])
                except:
                    continue
                if ex_id not in existing_ids:
                    pool_ex.append(ex)
                    existing_ids.add(ex_id)
                if len(pool_ex) >= MIN_EX:
                    break

        # Nếu vẫn rỗng -> chịu, không có bài để xếp
        if not pool_ex:
            print("[EX-PLAN] Không có bài tập nào (sau khi auto-fill).")
            return {}

        # --------------------------------------------------
        # 6. VÒNG LẶP 7 NGÀY
        # --------------------------------------------------
        for i in range(7):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            day_name = days_map[i]

            remaining = target_ex_cal
            ex_list = []

            # Xào lại thứ tự bài tập cho ngày đó
            day_pool = pool_ex[:]
            random.shuffle(day_pool)

            # ------- GHÉP BÀI TẬP ĐỂ GẦN ĐỦ target_ex_cal -------
            for ex in day_pool:
                if remaining <= 20:   # còn quá ít calo -> không nhét thêm
                    break

                cal_30 = int(ex.get('calories_burn_30min', 0) or 0)
                if cal_30 <= 0:
                    continue

                # tăng/giảm nhẹ theo difficulty_factor
                effective_target = int(remaining * difficulty_factor)

                if cal_30 <= effective_target:
                    # bài này không quá lớn -> cho tập full 30 phút
                    duration_min = 30
                    ex_cal = cal_30
                else:
                    # bài này khá lớn -> scale thời gian để fit phần calo còn thiếu
                    duration_min, ex_cal = scale_duration(cal_30, remaining)

                if ex_cal <= 10:
                    continue

                ex_list.append({
                    "id": int(ex['id']),
                    "name": ex['name'],
                    "type": ex.get('type', 'Workout'),
                    "duration_min": duration_min,
                    "cal": int(ex_cal)
                })

                remaining -= ex_cal

            total_cal_day = target_ex_cal - remaining
            diff_day = total_cal_day - target_ex_cal

            weekly_ex_plan[day_name] = {
                "date": date_str,
                "type": "Workout",          # đơn giản: ngày nào cũng là ngày tập
                "target_cal": int(target_ex_cal),
                "total_cal": int(total_cal_day),
                "diff": int(diff_day),
                "exercises": ex_list
            }

        return weekly_ex_plan

# Gợi ý Top K bài tập theo loại bằng cách kết hợp lọc an toàn, AI similarity và sở thích + trình độ của user
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
            "SELECT exercise_id_id, preference_type FROM preferences_userexercisepreferences WHERE user_id_id = %s", 
            (user['id'],)
        )
        user_prefs = {}
        if prefs_data is not None and not prefs_data.empty:
            user_prefs = {row['exercise_id_id']: row['preference_type'] for _, row in prefs_data.iterrows()}

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
   
    
    # Chuẩn bị danh sách món sáng, món chính và bài tập gợi ý theo calo/mục tiêu để user chọn trước khi tạo lịch
    def get_selection_options(self, user_id: int) -> dict:
  
        # 1. Lấy thông tin User
        user = get_data_from_db(
            "SELECT h.* FROM analysis_healthmetric h WHERE h.user_id = %s",
            (user_id,),
            single_row=True
        )
        if not user:
            return {}

        # Lấy daily_calo theo kiểu dict
        target_calories = user.get('daily_calo') or user.get('daily_calo'.upper()) or user.get('daily_calo'.lower())
        if not target_calories:
            # Không có thông tin calo -> không gợi ý được hợp lý
            target_calories = 2000  # fallback mặc định

        # ---------------------------------------------------------
        # 2. CHUẨN BỊ NGƯỠNG CALO KHOA HỌC HƠN
        # ---------------------------------------------------------

        # Bữa sáng ~ 20% - 30% tổng calo
        breakfast_min = target_calories * 0.20
        breakfast_max = target_calories * 0.30

        # Giả sử còn lại cho 2 bữa chính (trưa + tối)
        remaining_for_main = target_calories - ((breakfast_min + breakfast_max) / 2)
        per_main_meal = max(remaining_for_main / 2, 400)  # tối thiểu 400 kcal / bữa cho hợp lý

        # Nhóm "diet" (nhẹ) cho bữa chính: 60% - 90% calo một bữa chính
        main_diet_min = per_main_meal * 0.60
        main_diet_max = per_main_meal * 0.90

        # Nhóm "energy" (cao năng lượng): 90% - 130% calo một bữa chính
        main_energy_min = per_main_meal * 0.90
        main_energy_max = per_main_meal * 1.30

        # ---------------------------------------------------------
        # 3. CHUẨN BỊ POOL MÓN ĂN
        # ---------------------------------------------------------

        # A. Pool Bữa Sáng
        df_sang = self.recommend_foods(
            user_id=user_id,
            meal_type='sang',
            min_cal=breakfast_min,
            max_cal=breakfast_max,
            top_k=20
        )
        list_sang = df_sang.to_dict('records') if not df_sang.empty else []

        # B. Pool Bữa Chính (Trưa/Tối)
        # B1. Nhóm Diet (Nhẹ)
        df_diet = self.recommend_foods(
            user_id=user_id,
            meal_type='trua,toi',
            min_cal=main_diet_min,
            max_cal=main_diet_max,
            top_k=30
        )

        # B2. Nhóm Energy (Cao năng lượng)
        df_energy = self.recommend_foods(
            user_id=user_id,
            meal_type='trua,toi',
            min_cal=main_energy_min,
            max_cal=main_energy_max,
            top_k=30
        )

        # Ghép hai nhóm lại, bỏ trùng id, ưu tiên final_score cao
        if df_diet is not None and not df_diet.empty:
            df_main = df_diet.copy()
        else:
            df_main = pd.DataFrame()

        if df_energy is not None and not df_energy.empty:
            if df_main.empty:
                df_main = df_energy.copy()
            else:
                df_main = pd.concat([df_main, df_energy], ignore_index=True)

        if not df_main.empty:
            # Bỏ trùng món theo id, giữ món điểm cao hơn
            df_main = (
                df_main.sort_values(by='final_score', ascending=False)
                        .drop_duplicates(subset=['id'])
            )
            # Lấy khoảng 30–40 món để user chọn
            df_main = df_main.head(40)
            list_chinh = df_main.to_dict('records')
        else:
            list_chinh = []

        # ---------------------------------------------------------
              # ---------------------------------------------------------
        # 4. GỢI Ý BÀI TẬP
        # ---------------------------------------------------------
        goal = user.get('goal', 1)

        # Mapping goal -> các loại bài tập ưu tiên
        if goal == 1:       # Giảm cân: ưu tiên Cardio, rồi Strength
            preferred_types = ['Cardio', 'Strength']
        elif goal == 2:     # Tăng cơ: ưu tiên Strength, rồi Cardio
            preferred_types = ['Strength', 'Cardio']
        else:               # Duy trì / thư giãn: Cardio + Yoga
            preferred_types = ['Cardio', 'Yoga']

        list_ex = []

        for ex_type in preferred_types:
            df_ex = self._recommend_exercises_by_type(
                user=user,
                ex_type=ex_type,
                top_k= 3,   
                override_level=None
            )
            if df_ex is not None and not df_ex.empty:
                list_ex.extend(df_ex.to_dict('records'))

       
        return {
            "breakfast_options": list_sang,
            "main_dish_options": list_chinh,
            "exercise_options": list_ex,
        }

    
   # Tạo plan ăn uống + tập luyện 7 ngày từ danh sách món/bài user chọn (có auto-fill & cân calo thông minh)
    def generate_custom_plan_from_selection(self, user_id, selected_food_ids, selected_ex_ids, custom_items=[]):
    
        # 1. Lấy thông tin User để tính TDEE / daily_calo mục tiêu
        user = get_data_from_db(
            "SELECT h.*, u.date_of_birth FROM analysis_healthmetric h "
            "JOIN accounts_account u ON h.user_id = u.user_id "
            "WHERE h.user_id = %s",
            (user_id,),
            single_row=True
        )
        if not user:
            return {"error": "User not found"}

        # Lấy daily_calo
        target_calories = (
            user.get('daily_calo')
            or user.get('DAILY_CALO')
            or user.get('daily_calo'.lower())
        )
        if not target_calories:
            # Không có thông tin calo -> fallback
            target_calories = 2000

       
       

        # ==========================================
        # XỬ LÝ PHẦN ĂN UỐNG (MEAL PLAN)
        # ==========================================

        # A. Lấy món từ DB
        pool_foods = []
        if selected_food_ids:
            # Lưu ý: nếu selected_food_ids có cả string (custom_xxx) thì filter int trước khi query
            db_ids = [fid for fid in selected_food_ids if str(fid).isdigit()]
            if db_ids:
                ids_str = ','.join(map(str, db_ids))
                pool_foods = get_data_from_db(
                    f"SELECT * FROM preferences_food WHERE id IN ({ids_str})"
                ).to_dict('records')

        # --- XỬ LÝ MÓN CUSTOM ---
        for item in custom_items:
            fake_item = {
                'id': f"custom_{uuid.uuid4().hex[:8]}",  # "custom_a1b2c3"
                'name': item.get('name', 'Món tự chọn'),
                'calories': int(item.get('cal', 0)),
                'type': item.get('type', 'trua,toi'),  # 'sang' hoặc 'trua,toi'
                'is_custom': True
            }
            pool_foods.append(fake_item)
            selected_food_ids.append(fake_item['id'])  # ưu tiên món user nhập tay

        # B. Phân loại Sáng / Chính
        pool_sang = [f for f in pool_foods if 'sang' in f.get('type', '').lower()]
        pool_chinh = [f for f in pool_foods if 'sang' not in f.get('type', '').lower()]

        # C. Auto-fill (AI tự động bù nếu user chọn ít quá)
        # Cần ít nhất 3 món sáng & 5 món chính để xoay tua
        if len(pool_sang) < 3:
            needed = 3 - len(pool_sang)
            print(f">> User chọn thiếu {needed} món sáng. AI đang tìm thêm...")
            breakfast_min = target_calories * 0.20
            breakfast_max = target_calories * 0.30
            more_sang = self.recommend_foods(
                user_id,
                meal_type='sang',
                min_cal=breakfast_min,
                max_cal=breakfast_max,
                top_k=needed * 2
            )
            if not more_sang.empty:
                pool_sang.extend(more_sang.to_dict('records'))

        if len(pool_chinh) < 5:
            needed = 5 - len(pool_chinh)
            print(f">> User chọn thiếu {needed} món chính. AI đang tìm thêm...")
            main_energy_min = target_calories * 0.35
            main_energy_max = target_calories * 0.40
            more_main = self.recommend_foods(
                user_id,
                meal_type='trua,toi',
                min_cal=main_energy_min,
                max_cal=main_energy_max,
                top_k=needed * 2
            )
            if not more_main.empty:
                pool_chinh.extend(more_main.to_dict('records'))

        # D. Xếp lịch bằng thuật toán "SMART FINDER + DYNAMIC COMPENSATION"

        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        meal_plan = {}

        # Pool chính cho trưa/tối
        pool_main = pool_chinh

        # Lưu lại những món đã dùng trong tuần (để hạn chế trùng)
        used_foods = set()

        # Tỷ lệ phân bổ trưa/tối trên phần calo còn lại sau bữa sáng
        ratio_trua_toi = 0.6  # ~60% trưa, còn lại tối

        # ---------------------------------------------------------
        # 3. HÀM TÌM MÓN THÔNG MINH (SMART FINDER)
        # ---------------------------------------------------------
        def find_smart_meal(pool, target_val):
            """
            Logic: Ưu tiên món chưa ăn (Unique). 
            Nhưng nếu món chưa ăn lệch target quá 150kcal, 
            thì xem xét quay lại ăn món cũ (Repeat) nếu nó khớp hơn.
            """
            if not pool:
                return None

            # Tìm ứng viên trong nhóm CHƯA ĂN
            candidates_unique = [m for m in pool if m['id'] not in used_foods]
            best_unique = None
            if candidates_unique:
                best_unique = min(
                    candidates_unique,
                    key=lambda x: abs(x.get('calories', 0) - target_val)
                )

            # Tìm ứng viên trong TOÀN BỘ POOL (Bao gồm đã ăn)
            best_any = min(
                pool,
                key=lambda x: abs(x.get('calories', 0) - target_val)
            ) if pool else None

            if not best_unique:
                # Hết món mới -> Bắt buộc ăn lại
                return best_any
            if not best_any:
                return None

            # QUYẾT ĐỊNH:
            threshold = 150  # Ngưỡng chấp nhận sai số (kcal)
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
                # Nếu hết món sáng mới -> cho phép ăn lại
                if not valid_breakfasts:
                    valid_breakfasts = pool_sang

                m_sang = random.choice(valid_breakfasts) if valid_breakfasts else None
                if m_sang:
                    used_foods.add(m_sang['id'])
                    cal_sang = m_sang.get('calories', 0)
                else:
                    cal_sang = 0

                # --- BƯỚC 2: TÍNH TOÁN DƯ ---
                remaining_cal = target_calories - cal_sang

                # --- BƯỚC 3: BỮA TRƯA ---
                target_trua = remaining_cal * ratio_trua_toi
                m_trua = find_smart_meal(pool_main, target_trua)
                if m_trua:
                    used_foods.add(m_trua['id'])
                    cal_trua = m_trua.get('calories', 0)
                else:
                    cal_trua = 0

                # --- BƯỚC 4: BỮA TỐI ---
                target_toi = target_calories - cal_sang - cal_trua

                # Kẹp biên cho bữa tối
                if target_toi < 200:
                    target_toi = 200
                if target_toi > 900:
                    target_toi = 900

                m_toi = find_smart_meal(pool_main, target_toi)
                if m_toi:
                    used_foods.add(m_toi['id'])
                    cal_toi = m_toi.get('calories', 0)
                else:
                    cal_toi = 0

                # --- LƯU KẾT QUẢ ---
                if m_sang and m_trua and m_toi:
                    total_cal = cal_sang + cal_trua + cal_toi
                    meal_plan[day] = {
                        "total_calories": int(total_cal),
                        "target_calories": int(target_calories),
                        "diff": int(total_cal - target_calories),
                        "breakfast": {
                            "id": m_sang['id'],
                            "name": m_sang['name'],
                            "cal": int(cal_sang),
                        },
                        "lunch": {
                            "id": m_trua['id'],
                            "name": m_trua['name'],
                            "cal": int(cal_trua),
                        },
                        "dinner": {
                            "id": m_toi['id'],
                            "name": m_toi['name'],
                            "cal": int(cal_toi),
                        },
                    }
                else:
                    meal_plan[day] = {"error": "Không tìm thấy món ăn phù hợp"}

            except Exception as e:
                print(f"Error generating plan for {day}: {e}")
                meal_plan[day] = {"error": "Lỗi hệ thống"}

        # ==========================================
        # XỬ LÝ PHẦN TẬP LUYỆN (WORKOUT PLAN)
        # ==========================================
        # Tạm thời giữ logic cũ
        workout_plan = self.generate_weekly_exercise_plan( user_id=user_id,selected_ex_ids=selected_ex_ids)

        return {
            "meal_plan": meal_plan,
            "workout_plan": workout_plan
        }
