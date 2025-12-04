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
    metric.tdee = HealthMetric.calculate_tdee(metric.user, metric.weight_kg, metric.height_cm, metric.activity_level)
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
