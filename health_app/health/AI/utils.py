# api/utils.py
from datetime import date

def calculate_age(dob):
    """Tính tuổi từ ngày sinh."""
    if not dob: return 30 
    if isinstance(dob, str):
        try:
            parts = dob.split("-")
            dob = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except: return 30
    today = date.today()
    try:
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except: return 30

def map_bmi_to_exercise_needs(bmi, goal):
    """Chuyển BMI & Goal -> Nhu cầu bài tập."""

    # tài liệu nghiên cứu 
    bmi = float(bmi or 22)
    if bmi < 18.5: desired_cal = 150
    elif bmi < 25: desired_cal = 250
    elif bmi < 30: desired_cal = 350
    else: desired_cal = 500
    
    if goal == 1: preferred_type = 'cardio'
    elif goal == 2: preferred_type = 'strength'
    else: preferred_type = 'yoga' 
    return desired_cal, preferred_type

def map_goal_to_food_needs(goal):
    # sửa lại trong database để so chuẩn hóa
    
    """Chuyển Goal -> Nhu cầu dinh dưỡng."""
    if goal == 1:   return 400, 'low_carb'
    elif goal == 2: return 700, 'high_protein'
    else:           return 600, 'balanced'

# ... (Các hàm cũ trong utils.py giữ nguyên) ...

def calculate_daily_calories(weight, height, age, gender, activity_level=1, goal=3):
    """
    Tính TDEE (calo tiêu thụ hàng ngày) dựa trên công thức Mifflin-St Jeor.
    
    Tham số:
    - weight: Cân nặng (kg)
    - height: Chiều cao (cm)
    - age: Tuổi
    - gender: 'Nam'/'Male' hoặc 'Nu'/'Female'
    - activity_level: 1 (Ít), 2 (Nhẹ), 3 (Vừa), 4 (Nhiều)
    - goal: 1 (Giảm cân), 2 (Tăng cơ), 3 (Duy trì/Sức khỏe)
    """
    # 1. Xử lý dữ liệu đầu vào (tránh None/Null)
    w = float(weight or 60)
    h = float(height or 165)
    a = int(age or 30)
    
    # 2. Tính BMR (Basal Metabolic Rate - Năng lượng nền)
    # Công thức: (10 × weight) + (6.25 × height) - (5 × age) + s
    bmr = (10 * w) + (6.25 * h) - (5 * a)
    
    # Điều chỉnh theo giới tính
    if str(gender).strip().lower() in ['nam', 'male', 'm', 'trai']:
        bmr += 5
    else: # Nữ
        bmr -= 161

    # 3. Nhân hệ số vận động (TDEE)
    # activity_level map từ 1 đến 4 (tùy dữ liệu form của bạn)
    activity_multipliers = {
        1: 1.2,   # Sedentary (Ít vận động, làm văn phòng)
        2: 1.375, # Light (Tập nhẹ 1-3 ngày/tuần)
        3: 1.55,  # Moderate (Tập vừa 3-5 ngày/tuần)
        4: 1.725  # Active (Tập nhiều 6-7 ngày/tuần)
    }
    # Mặc định là 1.2 nếu không có dữ liệu
    tdee = bmr * activity_multipliers.get(activity_level, 1.2)

    # 4. Điều chỉnh theo Goal (Mục tiêu)
    if goal == 1:   # Giảm cân
        # Cắt giảm khoảng 20% hoặc 500 calo để giảm ~0.5kg/tuần
        target_calories = tdee - 500
    elif goal == 2: # Tăng cơ
        # Tăng thêm 300-500 calo để nuôi cơ
        target_calories = tdee + 400
    else:           # Duy trì (Goal 3)
        target_calories = tdee

    # 5. Ngưỡng an toàn (Safety Guardrail)
    # Không bao giờ trả về calo quá thấp gây hại sức khỏe
    # Nữ tối thiểu 1200, Nam tối thiểu 1500
    min_safe = 1500 if str(gender).strip().lower() in ['nam', 'male', 'm'] else 1200
    
    return max(int(target_calories), min_safe)