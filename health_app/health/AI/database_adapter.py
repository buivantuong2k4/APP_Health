from django.db import connection
import pandas as pd

def get_data_from_db(query, params=None, single_row=False):
    """
    Hàm thực thi SQL an toàn, tương thích tuyệt đối với Django.
    """
    print(f">> Executing SQL: {query} | Params: {params}")
    # Chuẩn hóa params: Nếu params là None thì đổi thành list rỗng, 
    # Nếu là 1 giá trị đơn lẻ (không phải list/tuple) thì gói vào list
    if params is not None:
        if not isinstance(params, (list, tuple)):
            params = [params]
    
    try:
        # Sử dụng Cursor của Django - Cách chuẩn nhất
        with connection.cursor() as cursor:
            
            # 1. Chạy lệnh SQL
            cursor.execute(query, params)
            
            # 2. Phân loại lệnh (SELECT hay INSERT/UPDATE)
            if query.strip().upper().startswith("SELECT"):
                # --- XỬ LÝ LẤY DỮ LIỆU ---
                
                # Lấy tên các cột (headers)
                columns = [col[0] for col in cursor.description]
                
                # Lấy dữ liệu
                data = cursor.fetchall()
                
                # Tạo Pandas DataFrame thủ công (Tránh lỗi tương thích)
                df = pd.DataFrame(data, columns=columns)
                
                if single_row:
                    if not df.empty:
                        # Convert dòng đầu tiên thành dict
                        return df.iloc[0].to_dict()
                    return None # Không có dữ liệu
                
                return df # Trả về DataFrame cho AI
            
            else:
                # --- XỬ LÝ GHI DỮ LIỆU (INSERT/UPDATE/DELETE) ---
                if query.strip().upper().startswith("INSERT"):
                    return cursor.lastrowid # Trả về ID vừa tạo
                return cursor.rowcount # Trả về số dòng bị ảnh hưởng

    except Exception as e:
        print(f"!! [Django DB Error]: {e}")
        print(f"   Query: {query}")
        print(f"   Params: {params}")
        return None