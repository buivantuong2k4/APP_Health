# api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import json



# Import các file bên cạnh
from .ai_engine import HealthRecommender
from .database_adapter import get_data_from_db

# --- KHỞI TẠO AI ENGINE (Singleton Pattern) ---
# Chỉ load 1 lần khi server chạy để tối ưu tốc độ
ai_engine = None
now =timezone.now()

def get_ai_instance():
    global ai_engine
    if ai_engine is None:
        print(">> [Django] Đang khởi động AI Engine...")
        ai_engine = HealthRecommender()
        try:
            ai_engine.load_data()
            print(">> [Django] AI Engine Sẵn sàng!")
        except Exception as e:
            print(f"!! [Django] Lỗi khởi động AI: {e}")
    return ai_engine

# ==========================================
# 1. API GỢI Ý (Selection)
# ==========================================
class SuggestionView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "Missing user_id"}, status=400)
        
        engine = get_ai_instance()
        try:
            options = engine.get_selection_options(int(user_id))
            print(f"Gợi ý cho user {user_id}: {options}")
            return Response(options)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

# ==========================================
# 2. API TẠO LỊCH NHÁP (Preview)
# ==========================================
class GeneratePlanView(APIView):
    def post(self, request):
        # Django dùng request.data thay vì request.json
        user_id = request.data.get('user_id')
        food_ids = request.data.get('food_ids', [])
        ex_ids = request.data.get('exercise_ids', [])
        custom_items = request.data.get('custom_items', []) # Nhận món custom từ UI

        if not user_id:
            return Response({"error": "Missing user_id"}, status=400)

        engine = get_ai_instance()
        try:
            # Gọi hàm AI đã sửa logic custom
            plan = engine.generate_custom_plan_from_selection(
                user_id, 
                food_ids, 
                ex_ids, 
                custom_items
            )
            return Response(plan)
        except Exception as e:
            print(f"Error Gen Plan: {e}")
            return Response({"error": str(e)}, status=500)

# ==========================================
# 3. API LƯU LỊCH (Save)
# ==========================================
class SavePlanView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        plan_data = request.data.get('plan_data')

        if not user_id or not plan_data:
            return Response({"error": "Missing data"}, status=400)

        try:
            # Tính toán ngày bắt đầu (Thứ 2 của tuần hiện tại)
            today = timezone.now().date()
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            
            plan_str = json.dumps(plan_data, ensure_ascii=False)

            # Dùng adapter để lưu vào MySQL
            query = """
                INSERT INTO analysis_weeklyplans (user_id_id, start_date, end_date, plan_data, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """
            new_id = get_data_from_db(query, [user_id, start_date, end_date, plan_str])
            
            return Response({
                "message": "Lưu thành công",
                "plan_id": new_id,
                "start_date": str(start_date),
                "end_date": str(end_date)
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

# ==========================================
# 4. API TRACKING & CURRENT PLAN
# ==========================================
class TrackItemView(APIView):
    def post(self, request):
        data = request.data
        user_id = data.get('user_id')
        plan_id = data.get('weekly_plan_id')
        date_str = data.get('date')
        item_type = data.get('item_type')
        raw_item_id = data.get('item_id')
        is_completed = bool(data.get('is_completed'))
        instance_id = data.get('instance_id')

        # Xử lý ID ảo cho món Custom
        db_item_id = raw_item_id
        if isinstance(raw_item_id, str) and str(raw_item_id).startswith("custom_"):
            db_item_id = 0 # Lưu 0 để không lỗi DB INT

        try:
            # Ưu tiên check theo instance_id
            if instance_id:
                check_q = "SELECT id FROM analysis_plantracking WHERE instance_id = %s"
                existing = get_data_from_db(check_q, [instance_id], single_row=True)
            else:
                check_q = "SELECT id FROM analysis_plantracking WHERE weekly_plan_id=%s AND date=%s AND item_type=%s AND item_id=%s"
                existing = get_data_from_db(check_q, [plan_id, date_str, item_type, db_item_id], single_row=True)

            if existing:
                upd_q = "UPDATE analysis_plantracking SET is_completed=%s, user_id_id" \
                "=%s WHERE id=%s"
                get_data_from_db(upd_q, [is_completed, user_id, existing['id']])
            else:
                ins_q = """
                    INSERT INTO analysis_plantracking (user_id_id, weekly_plan_id, date, item_type, item_id, is_completed, instance_id, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                get_data_from_db(ins_q, [user_id, plan_id, date_str, item_type, db_item_id, is_completed, instance_id,now])
                
            return Response({"success": True})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class CurrentPlanView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')
        try:
            # 1. Lấy Plan mới nhất
            # Lưu ý: get_data_from_db trả về dict nếu single_row=True
            plan_q = "SELECT * FROM analysis_weeklyplans WHERE user_id_id = %s ORDER BY created_at DESC LIMIT 1"
            row = get_data_from_db(plan_q, [user_id], single_row=True)
            
            if not row: return Response({})

            plan_obj = json.loads(row['plan_data']) if isinstance(row['plan_data'], str) else row['plan_data']
            plan_id = row['id']
            start_date = row['start_date']

            # 2. Lấy Tracking
            track_q = "SELECT * FROM analysis_plantracking WHERE weekly_plan_id = %s"
            tracking_df = get_data_from_db(track_q, [plan_id]) # Trả về DataFrame
            
            # Convert DF sang Dict để map cho dễ
            tracking_map = {}
            if tracking_df is not None and not tracking_df.empty:
                records = tracking_df.to_dict('records')
                for t in records:
                    if t.get('instance_id'):
                        tracking_map[t['instance_id']] = t['is_completed']
            
            # 3. Merge dữ liệu
            day_offset = {'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6}
            
            for day_key, items in plan_obj.items():
                if day_key not in day_offset: continue
                # Logic map tracking
                if isinstance(items, list): # Đảm bảo items là list (tránh trường hợp lỗi struct)
                    for item in items:
                        inst_id = item.get('instanceId') or item.get('instance_id')
                        if inst_id and inst_id in tracking_map:
                            item['isCompleted'] = bool(tracking_map[inst_id])
                        else:
                            item['isCompleted'] = False

            plan_obj['plan_id'] = plan_id
            plan_obj['start_date'] = str(start_date)
            plan_obj['end_date'] = str(row['end_date'])
            
            return Response(plan_obj)
            
        except Exception as e:
            print(f"Error get current: {e}")
            return Response({"error": str(e)}, status=500)