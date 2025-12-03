# views.py
from functools import wraps
from django.http import JsonResponse
import jwt

from health import settings
from .models import Account
import json
# from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password, make_password
import hashlib
from django.core.mail import send_mail
from datetime import datetime, timedelta




def token_required(func):
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return JsonResponse({"error": "Token missing"}, status=401)
        if token.startswith("Bearer "):
            token = token[7:]  # bỏ 'Bearer ' nếu có

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user = Account.objects.get(user_id=payload["user_id"])
            request.user = user  # gán user cho request
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Account.DoesNotExist):
            return JsonResponse({"error": "Invalid token"}, status=401)

        return func(request, *args, **kwargs)
    return wrapper
def sha256_hash(pw):
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

@api_view(['POST'])
@csrf_exempt
def login_view(request):
    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")

    try:
        user = Account.objects.get(email=email)
    except Account.DoesNotExist:
        return JsonResponse({"error": "Invalid email or password"}, status=401)

    if check_password(password, user.password_hash):
        pass
    if user.password_hash == sha256_hash(password):
        user.password_hash = make_password(password)
        user.save()
    # Token tự tạo
    payload = {
        "user_id": user.user_id,
        "email": user.email
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    return JsonResponse({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.user_id,
            "full_name": user.full_name,
            "email": user.email,
        }
    })
# @csrf_exempt
@api_view(['POST'])
def register_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    data = json.loads(request.body)
    full_name = data.get("full_name","")
    email = data.get("email")
    password = data.get("password")
    gender = data.get("gender","")
    date_of_birth = data.get("date_of_birth",None)

    # Kiểm tra dữ liệu
    if  not email or not password:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    # Kiểm tra email trùng
    if Account.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already registered"}, status=409)

    # Tạo user
    user = Account(
        full_name=full_name,
        email=email,
        gender=gender,
        date_of_birth=date_of_birth
    )
    user.set_password(password)
    user.save()

    return JsonResponse({
        "message": "Registration successful",
        "user": {
            "id": user.user_id,
            "full_name": user.full_name,
            "email": user.email
        }
    })
@token_required
@csrf_exempt
def get_user_frofile(request):
    if request.method !="GET":
        return JsonResponse({"error": "GET required"})
    user = request.user
    return JsonResponse({
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "gender": user.gender,
        "date_of_birth" : user.date_of_birth
    })

@token_required
@csrf_exempt
def update_user_profile(request):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT required"}, status=400)
    
    user = request.user
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    full_name = data.get("full_name")
    phone = data.get("phone")
    gender = data.get("gender")
    dob = data.get("dob")  # chuỗi 'YYYY-MM-DD'
    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    if gender is not None:
        user.gender = gender
    if dob is not None:
        from django.utils.dateparse import parse_date
        parsed_dob = parse_date(dob)
        if parsed_dob:
            user.date_of_birth = parsed_dob

    user.save()
    return JsonResponse({
        "message": "Profile updated successfully",
        "user": {
            "full_name": user.full_name,
            "phone": getattr(user, "phone", None),
            "gender": user.gender,
            "dob": user.date_of_birth.strftime("%Y-%m-%d") if user.date_of_birth else None,
            "email": user.email  # chỉ hiển thị, không cho update
        }
    })
@api_view(['GET'])
def verify_token_view(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return Response({"error": "No token"}, status=401)

    try:
        # Nếu dùng Bearer
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return Response({"user_id": payload["user_id"], "email": payload["email"]})
    except jwt.ExpiredSignatureError:
        return Response({"error": "Token expired"}, status=401)
    except jwt.InvalidTokenError:
        return Response({"error": "Invalid token"}, status=403)

@token_required
@csrf_exempt
def post_passwoord(request):
    if request.method !="POST":
         return JsonResponse({"error": "POST required"}, status=400)
    user = request.user
    data = json.loads(request.body)
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    if not old_password or not new_password or not confirm_password:
        return JsonResponse({"error": "All fields are required"}, status = 400)
    if not check_password(old_password, user.password_hash):
         return JsonResponse({"error": "Old password is incorrect"}, status=400)
    if new_password != confirm_password:
         return JsonResponse({"error": "New password and confirmation do not match"}, status=400)
    user.password = make_password(new_password)
    user.save()
    return JsonResponse({"message": "Password updated successfully"})

@csrf_exempt
def forgot_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    try:
        data = json.loads(request.body)
        email = data.get("email")

        if not email:
            return JsonResponse({"error": "Email required"}, status=400)

        # Kiểm tra email có tồn tại không
        try:
            user = Account.objects.get(email=email)
        except Account.DoesNotExist:
            return JsonResponse({"error": "Email không tồn tại"}, status=404)

        # --- Tạo token ---
        payload = {
            "email": user.email,
            "exp": datetime.utcnow() + timedelta(minutes=15)  # token hết hạn sau 15 phút
        }
        reset_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        # Trả về token để frontend xử lý
        return JsonResponse({
            "message": "Email tồn tại trong hệ thống",
            "reset_token": reset_token
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

@csrf_exempt
def reset_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    try:
        data = json.loads(request.body)
        token = data.get("token")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        # Kiểm tra dữ liệu đầu vào
        if not token or not new_password or not confirm_password:
            return JsonResponse(
                {"error": "Token và mật khẩu mới là bắt buộc"}, status=400
            )
        if new_password != confirm_password:
            return JsonResponse(
                {"error": "Mật khẩu xác nhận không khớp"}, status=400
            )

        # Giải mã token
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            email = payload.get("email")
            if not email:
                return JsonResponse({"error": "Token không hợp lệ"}, status=401)
        except jwt.ExpiredSignatureError:
            return JsonResponse({"error": "Token đã hết hạn"}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({"error": "Token không hợp lệ"}, status=401)

        # Lấy user
        try:
            user = Account.objects.get(email=email)
        except Account.DoesNotExist:
            return JsonResponse({"error": "User không tồn tại"}, status=404)

        # Cập nhật mật khẩu
        user.set_password(new_password)
        user.save()

        return JsonResponse({"message": "Mật khẩu đã được thay đổi thành công"})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    