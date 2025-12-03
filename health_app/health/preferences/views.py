import json
from pyexpat import model
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from accounts.views import token_required
from preferences.models import UserExercisePreferences, UserFoodPreferences

@token_required
@csrf_exempt
def add_food_preference(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)
    
    data = json.loads(request.body)
    food_id = data.get("food_id")
    preference_type = data.get("preference_type")
    user = request.user
    
    food = UserFoodPreferences.add_preference_food(
        user_id=user.user_id,
        food_id=food_id,
        preference_type = preference_type
    )
    if food:
        return JsonResponse({
            "message": "đã lưu lựa chọn",
            "food":{
                "user_name": food.user_id.full_name,
                "food_name": food.food_id.name,
                "preference_type": food.preference_type,
                "created_at": food.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
        })
    else:
        return JsonResponse({"error": "User not found"}, status=404)
    
@token_required
@csrf_exempt
def update_food_preference(request,food_preference_id):
    if request.method !="PUT":
        return JsonResponse ({"error": "PUT required"}, status=400)
    try:
        food_preference  = UserFoodPreferences.objects.get(id = food_preference_id)
    except UserFoodPreferences.DoesNotExist:
        return JsonResponse({"error": "id not found"}, status=404)
    data = json.loads(request.body)   
    food_preference.preference_type = data.get("preference_type")
    food_preference.save()
    return JsonResponse({
            "message": "đã lưu lựa chọn",
            "food":{
                "user_name": food_preference.user_id.full_name,
                "food_name": food_preference.food_id.name,
                "preference_type": food_preference.preference_type,
                "created_at": food_preference.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
     })
@csrf_exempt
def delete_food_preference(request,food_preference_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE required"}, status=400)
    try:
        food_preference  = UserFoodPreferences.objects.get(id = food_preference_id)
    except UserFoodPreferences.DoesNotExist:
        return JsonResponse({"error": "id not found"}, status=404)
    
    food_preference.delete()
    return JsonResponse({
        "message": "Food preference đã được xóa",
        "food_preference_id": food_preference_id
    })

@token_required
@csrf_exempt
def add_exercise_preference(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)
    
    data = json.loads(request.body)
    exercise_id = data.get("exercise_id")
    preference_type = data.get("preference_type")
    user = request.user
    
    exercise = UserExercisePreferences.add_preference_exercide(
        user_id=user.user_id,
        exercise_id=exercise_id,
        preference_type = preference_type
    )
    if exercise:
        return JsonResponse({
            "message": "đã lưu lựa chọn",
            "food":{
                "user_name": exercise.user_id.full_name,
                "exercise_name": exercise.exercise_id.name,
                "preference_type": exercise.preference_type,
                "created_at": exercise.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
        })
    else:
        return JsonResponse({"error": "User not found"}, status=404)
    
@token_required
@csrf_exempt
def update_exercise_preference(request,exercise_preference_id):
    if request.method !="PUT":
        return JsonResponse ({"error": "PUT required"}, status=400)
    try:
        exercise_preference  = UserExercisePreferences.objects.get(id = exercise_preference_id)
    except UserExercisePreferences.DoesNotExist:
        return JsonResponse({"error": "id not found"}, status=404)
    data = json.loads(request.body)   
    exercise_preference.preference_type = data.get("preference_type")
    exercise_preference.save()
    return JsonResponse({
            "message": "đã lưu lựa chọn",
            "food":{
                "user_name": exercise_preference.user_id.full_name,
                "food_name": exercise_preference.exercise_id.name,
                "preference_type": exercise_preference.preference_type,
                "created_at": exercise_preference.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
     })
@csrf_exempt
def delete_exercise_preference(request,exercise_preference_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE required"}, status=400)
    try:
        exercise_preference  = UserExercisePreferences.objects.get(id = exercise_preference_id)
    except UserExercisePreferences.DoesNotExist:
        return JsonResponse({"error": "id not found"}, status=404)
    
    exercise_preference.delete()
    return JsonResponse({
        "message": "Food preference đã được xóa",
        "food_preference_id": exercise_preference_id
    })