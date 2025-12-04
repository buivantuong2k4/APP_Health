from datetime import timedelta
import json
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from accounts.views import token_required
import analysis
from analysis.models import HealthMetric, PlanTracking, WeeklyPlans
from preferences.models import Exercise, Food
from rest_framework.decorators import api_view
from django.utils.dateparse import parse_date

@token_required
@csrf_exempt
def add_metric_view(request):
    data = json.loads(request.body)

    activity_level_map = {
        "sedentary": 1,
        "light": 2,
        "moderate": 3,
        "active": 4
    }
    goal_map = {
        "lose_weight": 1,
        "maintain": 2,
        "gain_muscle": 3
    }

    user = request.user
    metric = HealthMetric.add_metric(
        user_id=user.user_id,
        height_cm=data.get("height_cm"),
        weight_kg=data.get("weight_kg"),
        heart_rate=data.get("heart_rate"),
        blood_pressure_systolic=data.get("blood_pressure_systolic"),
        blood_pressure_diastolic=data.get("blood_pressure_diastolic"),
        sleep_hours=data.get("sleep_hours"),
        goal=goal_map.get(data.get("goal")),
        has_hypertension=data.get("has_hypertension", False),
        has_diabetes=data.get("has_diabetes", False),
        activity_level=activity_level_map.get(data.get("activity_level"))
    )

    return JsonResponse({
        "message": "Metric saved",
        "metric_id": metric.id
    })
    
    
@csrf_exempt
def upload_metrics_view(request, metric_id):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT required"}, status=400)
    try:
        metric  = HealthMetric.objects.get(id = metric_id)
    except HealthMetric.DoesNotExist:
        return JsonResponse({"error": "Metric not found"}, status=404)
    
    tdee_data = HealthMetric.calculate_tdee(metric.user, metric.weight_kg, metric.height_cm, metric.activity_level,metric.goal)
        
    if tdee_data:
        tdee_value = tdee_data["tdee"]           
    data = json.loads(request.body)
    metric.height_cm = data.get("height_cm", metric.height_cm)
    metric.weight_kg = data.get("weight_kg", metric.weight_kg)
    metric.heart_rate = data.get("heart_rate", metric.heart_rate)
    metric.blood_pressure_diastolic = data.get("blood_pressure_diastolic", metric.blood_pressure_diastolic)
    metric.blood_pressure_systolic = data.get("blood_pressure_systolic", metric.blood_pressure_systolic)
    metric.sleep_hours = data.get("sleep_hours", metric.sleep_hours)
    metric.goal = data.get("goal", metric.goal)
    metric.has_hypertension = data.get("has_hypertension", metric.has_hypertension)
    metric.has_diabetes = data.get("has_diabetes", metric.has_diabetes)
    metric.activity_level = data.get("activity_level", metric.activity_level)
    metric.bmi = HealthMetric.calculate_bmi(metric.weight_kg, metric.height_cm)
    metric.tdee = data.get("tdee", metric.tdee)
    metric.daily_calo = data.get("daily_calo", metric.daily_calo)
    metric.save()
    return JsonResponse({
        "message": "Metric updated",
        "metric": {
            "metric_id": metric.id,
            "user": metric.user.full_name,
            "height_cm": metric.height_cm,
            "weight_kg": metric.weight_kg,
            "heart_rate": metric.heart_rate,
            "blood_pressure_systolic": metric.blood_pressure_systolic,
            "blood_pressure_diastolic": metric.blood_pressure_diastolic,
            "activity_level": metric.activity_level,
            "bmi": metric.bmi,
            "tdee": metric.tdee,
            "updated_at": metric.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        }
    })
    

@token_required
@csrf_exempt
def get_analysis_by_user(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET required"}, status=400)

    user = request.user  # từ token

    # filter metrics của user
    metrics = HealthMetric.objects.filter(user_id=user.user_id).order_by("-updated_at")

    data = []
    for m in metrics:
        data.append({
            "metric_id": m.id,
            "height_cm": m.height_cm,
            "weight_kg": m.weight_kg,
            "heart_rate": m.heart_rate,
            "blood_pressure_systolic": m.blood_pressure_systolic,
            "blood_pressure_diastolic": m.blood_pressure_diastolic,
            "bmi": m.bmi,
            "tdee": m.tdee,
            "goal":m.goal,
            "daily_calo": m.daily_calo,
            "daily_burn":m.daily_burn,
            "has_hypertension": m.has_hypertension,
            "has_diabetes": m.has_diabetes,
            "sleep_hours": m.sleep_hours,
            "updated_at": m.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
            "activity_level": m.activity_level,
            
        })

    return JsonResponse({"user": user.full_name, "metrics": data}, safe=False)


@token_required
@csrf_exempt
def add_weekly_plan(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    data = json.loads(request.body)
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    plan_data = {
    "meal_plan": data.get("meal_plan"),
    "workout_plan": data.get("workout_plan")
}

    user = request.user

    plan = WeeklyPlans.add_weekly_plan(
        user_id=user.user_id,  # user_id là trường trong Account
        start_date=start_date,
        end_date=end_date,
        plan_data=plan_data
    )

    if plan:
        PlanTracking.add_plan_tracking(plan)
        return JsonResponse({
            "message": "Weekly plan saved",
            "plan": {
                "plan_id": plan.id,
                "user": plan.user_id.full_name,
                "start_date": plan.start_date.strftime("%Y-%m-%d")  ,
                "end_date": plan.end_date.strftime("%Y-%m-%d")  ,
                "plan_data": plan.plan_data,
                "created_at": plan.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
        })
    else:
        return JsonResponse({"error": "User not found"}, status=404)

@token_required
@csrf_exempt
def get_weekly_plans(request):
    if request.method != "GET":
        return JsonResponse ({"error": "GET required"}, status=400)
    user = request.user
    plans = WeeklyPlans.objects.filter(user_id = user.user_id).order_by("-created_at")
    data = []
    week_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for p in plans: 
        meal_plan = p.plan_data.get("meal_plan", {} )if p.plan_data else {}
        workout_plan = p.plan_data.get("workout_plan", {}) if p.plan_data else {}
        
        days = {}
        for day in week_days:
            days[day] = {
                "meal_plan": meal_plan.get(day, {}),
                "workout_plan": workout_plan.get(day, {})
            }
        data.append({
            "plan_id": p.id,
            "start_date": p.start_date.strftime("%Y-%m-%d") if p.start_date else None,
            "end_date": p.end_date.strftime("%Y-%m-%d") if p.end_date else None,            
            "plan_by_day" : days,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return JsonResponse({"weekly plans":data},safe = False)

@token_required
@csrf_exempt
@token_required
@csrf_exempt
def get_plan_tracking(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET required"}, status=400)

    date_str = request.GET.get("date")
    if not date_str:
        return JsonResponse({"error": "date required"}, status=400)

    date_obj = parse_date(date_str)
    if not date_obj:
        return JsonResponse({"error": "Invalid date format"}, status=400)

    # --- Tính tuần chứa date_obj ---
    # Thứ 2 = 0, Chủ nhật = 6
    weekday = date_obj.weekday()  # 0 = Thứ 2
    start_of_week = date_obj - timedelta(days=weekday)
    end_of_week = start_of_week + timedelta(days=6)

    # Lọc tất cả plan trong tuần
    tracking = PlanTracking.objects.filter(date__range=[start_of_week, end_of_week])
    data = []

    for plan in tracking:
        item_detail = None
        if plan.item_type == "food" and plan.item_id:
            try:
                food = Food.objects.get(id=plan.item_id)
                item_detail = {
                    "name": food.name,
                    "description": food.description,
                    "calories": food.calories,
                    "protein_g": food.protein_g,
                    "fat_g": food.fat_g,
                    "carb_g": food.carbs_g
                }
            except Food.DoesNotExist:
                item_detail = None
        elif plan.item_type == "exercise" and plan.item_id:
            try:
                ex = Exercise.objects.get(id=plan.item_id)
                item_detail = {
                    "name": ex.name,
                    "description": ex.description,
                    "calories": ex.calories_burn_30min,
                    "type": ex.type
                }
            except Exercise.DoesNotExist:
                item_detail = None

        data.append({
            "tracking_id": plan.id,
            "date": plan.date.strftime("%Y-%m-%d") if plan.date else None,
            "item_type": plan.item_type,
            "item_id": plan.item_id,
            "item_detail": item_detail,
            "is_completed": plan.is_completed,
            "created_at": plan.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    return JsonResponse({
        "start_of_week": start_of_week.strftime("%Y-%m-%d"),
        "end_of_week": end_of_week.strftime("%Y-%m-%d"),
        "plan_tracking": data
    })

@token_required
@csrf_exempt
def put_plan_tracking(request, tracking_id):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT required"}, status=400)

    # Tìm theo tracking_id trực tiếp
    try:
        tracking = PlanTracking.objects.get(id=tracking_id)
    except PlanTracking.DoesNotExist:
        return JsonResponse({"error": "Tracking not found"}, status=404)

    # Lấy dữ liệu gửi lên
    data = json.loads(request.body)
    new_status = data.get("is_completed")

    if new_status is None:
        return JsonResponse({"error": "is_completed required"}, status=400)

    # Update
    tracking.is_completed = new_status
    tracking.save()

    return JsonResponse({
        "message": "Tracking updated",
        "tracking": {
            "tracking_id": tracking.id,
            "date": tracking.date.strftime("%Y-%m-%d"),
            "item_type": tracking.item_type,
            "item_id": tracking.item_id,
            "is_completed": tracking.is_completed
        }
    })

# def calculate_user_targets(weight_kg, height_cm, age, gender, activity_level, goal):
    """
    Tính toán mục tiêu Calo Nạp vào (Intake) và Calo Tiêu hao (Burn) dựa trên chỉ số cơ thể.
    
    Logic cập nhật:
    - Sử dụng công thức Mifflin-St Jeor để tính BMR.
    - Tính TDEE dựa trên hệ số vận động (PAL).
    - Áp dụng 'Thâm hụt linh hoạt' (Dynamic Deficit) ~20% TDEE cho giảm cân an toàn.
    - Chia sẻ gánh nặng giảm cân: 60% từ ăn kiêng, 40% từ tập luyện.
    
    Input:
        - weight_kg (float): Cân nặng (kg)
        - height_cm (float): Chiều cao (cm)
        - age (int): Tuổi
        - gender (str): 'Male' hoặc 'Female'
        - activity_level (int): 1 (Sedentary) -> 5 (Extra Active)
        - goal (int): 
            1: Giảm cân (Lose Weight)
            2: Tăng cơ (Gain Muscle)
            3: Duy trì (Maintain)
            
    Output:
        - Dict chứa: tdee, daily_intake (calo ăn), daily_burn (calo tập)
    """
    
    # --- BƯỚC 1: TÍNH BMR (Basal Metabolic Rate) ---
    # Công thức Mifflin-St Jeor (Được ưu tiên hiện nay)
    if gender == 'Male':
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161

    # --- BƯỚC 2: TÍNH TDEE (Total Daily Energy Expenditure) ---
    # Mapping Activity Level sang hệ số
    # Level 1: Ít vận động (1.2)
    # Level 2: Nhẹ (1.375)
    # Level 3: Vừa (1.55)
    # Level 4: Nặng (1.725)
    # Level 5: Rất nặng (1.9)
    activity_multipliers = {
        1: 1.2,
        2: 1.375,
        3: 1.55,
        4: 1.725,
        5: 1.9
    }
    
    # Lấy hệ số, mặc định 1.2 nếu không tìm thấy
    multiplier = activity_multipliers.get(activity_level, 1.2)
    tdee = int(bmr * multiplier)

    # --- BƯỚC 3: TÍNH MỤC TIÊU (INTAKE & BURN) ---
    daily_intake = 0
    daily_burn = 0
    
    if goal == 1: # GIẢM CÂN (Lose Weight)
        # [AN TOÀN] Dùng quy tắc thâm hụt 20% TDEE thay vì con số cố định
        total_deficit_needed = tdee * 0.20 
        
        # Kẹp biên (Safety Clamp): 
        # Thâm hụt tối thiểu 300kcal để thấy hiệu quả
        # Thâm hụt tối đa 1000kcal để tránh suy nhược
        total_deficit_needed = max(300, min(total_deficit_needed, 1000))
        
        # [CHIẾN THUẬT CHIA SẺ GÁNH NẶNG] 
        # 60% thâm hụt đến từ ăn uống (Diet)
        # 40% thâm hụt đến từ tập luyện (Exercise)
        diet_deficit = total_deficit_needed * 0.6
        exercise_deficit = total_deficit_needed * 0.4
        
        # 1. Mục tiêu ăn vào (Calo In):
        # Safety Floor: Không bao giờ khuyên ăn dưới mức BMR
        daily_intake = int(max(bmr, tdee - diet_deficit))
        
        # 2. Mục tiêu tập luyện (Calo Out):
        # Đặt mức tối thiểu 200kcal để khuyến khích vận động tim mạch
        base_burn = 200 
        daily_burn = int(max(base_burn, exercise_deficit))

    elif goal == 2: # TĂNG CÂN / TĂNG CƠ (Gain Muscle)
        # Tăng cân an toàn: Dư thừa (Surplus) khoảng 10-15% TDEE
        surplus = tdee * 0.15
        
        # Kẹp biên thặng dư: 250 - 500 kcal
        surplus = max(250, min(surplus, 500))
        
        daily_intake = int(tdee + surplus)
        
        # Tập luyện để kích thích cơ bắp sử dụng năng lượng dư thừa
        # Mức 300kcal là vừa đủ cho một buổi tập gym hiệu quả mà không đốt hết calo thặng dư
        daily_burn = 300 

    else: # DUY TRÌ (Maintain)
        # Ăn bằng TDEE để giữ cân
        daily_intake = int(tdee)
        
        # Mục tiêu vận động để giữ sức khỏe
        # Tính phần năng lượng 'Active' trong TDEE
        sedentary_tdee = bmr * 1.2
        estimated_active_calories = tdee - sedentary_tdee
        
        # Nếu người dùng chọn level thấp, vẫn khuyến khích tập nhẹ 200kcal
        daily_burn = int(max(200, estimated_active_calories))

    return {
        "tdee": int(tdee),
        "daily_intake": int(daily_intake), # Lưu vào DB: daily_calorie_target
        "daily_burn": int(daily_burn)      # Lưu vào DB: daily_burn_target
    }