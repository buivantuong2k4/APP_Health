# 🩺 Health App — Setup Guide

Chào mừng đến với dự án **Health App**. Đây là ứng dụng theo dõi sức khỏe bao gồm Backend (Django) và Frontend (React Native Expo).

## 🏗️ Tech Stack

| Phần | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Backend** | ![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django&logoColor=white) | Python Framework |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white) | PostgreSQL (khuyên dùng `psycopg`) hoặc supabase cho nhanh |
| **Frontend** | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB) | Expo Framework |

---

## 🚀 1. Backend Setup (Django)

### 📂 Bước 1: Khởi tạo môi trường ảo (Virtual Environment)

Truy cập vào thư mục backend:
```bash
cd health_app/health
Windows:
Bash
python -m venv venv
venv\Scripts\activate

macOS / Linux:
Bash
python3 -m venv venv
source venv/bin/activate
📦 Bước 2: Cài đặt thư viện
Cài đặt các gói cần thiết từ file requirements.txt:
Bash
pip install -r requirements.txt
💡 Lưu ý: Nếu gặp lỗi liên quan đến database driver, hãy chạy lệnh sau:

Bash
pip install "psycopg[binary]"
🗄️ Bước 3: Cấu hình Database & Migration
-Tạo trước dâtbase để setting
Mở file health/settings.py và cấu hình thông tin Database (PostgreSQL/MySQL) của bạn.
Chạy các lệnh sau để khởi tạo database:

Bash
# Tạo file migration từ models
python manage.py makemigrations
# Áp dụng migration để tạo bảng trong DB
python manage.py migrate
▶️ Bước 4: Khởi chạy Server
Chạy server Django (cho phép truy cập từ các thiết bị khác trong mạng):
Bash
python manage.py runserver 0.0.0.0:8000
🌐 Địa chỉ Server:
Local PC: http://localhost:8000/

Android Emulator: http://10.0.2.2:8000/ (Đây là IP đặc biệt để máy ảo Android gọi về máy thật)

📱 2. Frontend Setup (React Native – Expo)
🛠️ Bước 1: Cài đặt Frontend
Đi vào thư mục chứa code frontend:
Bash
cd app
# Hoặc đường dẫn cụ thể của bạn
Cài đặt các node_modules:
Bash
npm install
Cài đặt các gói bổ sung (nếu thiếu):
Bash
npx expo install react-native-svg
npm install @react-native-async-storage/async-storage

Code đang chạy trên Android Emulator.
▶️ Bước 3: Chạy ứng dụng
Khởi động Expo Metro Bundler:

Bash

npx expo start
Nhấn phím a để mở trên Android Emulator.


npx expo start
