from django.db import models
from accounts.models import Account  # liên kết với Account
from datetime import date, datetime, timedelta
import uuid
class HealthMetric(models.Model):
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="metrics")
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    tdee = models.IntegerField(null=True, blank=True)
    blood_pressure_systolic = models.SmallIntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.SmallIntegerField(null=True, blank=True)
    heart_rate = models.SmallIntegerField(null=True, blank=True)
    activity_level = models.SmallIntegerField(null=True, blank=True)  # 1-5
    sleep_hours = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    goal = models.SmallIntegerField(null=True, blank=True)
    has_hypertension = models.BooleanField(default=False)
    has_diabetes = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    daily_burn = models.IntegerField(null=True, blank=True)
    daily_calo = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.updated_at.strftime('%Y-%m-%d %H:%M:%S')}"
    
    @staticmethod
    def calculate_bmi(weight_kg, height_cm):
        if not weight_kg or not height_cm:
            return None
        return round(float(weight_kg) / ((float(height_cm) / 100) ** 2), 2)

    @staticmethod
    def calculate_tdee(user, weight_kg, height_cm, activity_level, goal):
        if not (user and weight_kg and height_cm and hasattr(user, 'date_of_birth') and user.date_of_birth and user.gender):
           return None
        today = date.today()
        age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))

        weight = float(weight_kg)
        height = float(height_cm)

        if user.gender.lower() == "male":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161

        activity_map = {
        1: 1.2,
        2: 1.375,
        3: 1.55,
        4: 1.725
       }
        factor = activity_map.get(activity_level, 1.2)
        tdee  = int(bmr * factor)
        daily_calo = daily_burn = 0
        
        if goal == 1:  # Lose Weight
            total_deficit = max(300, min(tdee * 0.2, 1000))  # clamp 300-1000 kcal
            diet_deficit = total_deficit * 0.6
            exercise_deficit = total_deficit * 0.4
            daily_calo = int(max(bmr, tdee - diet_deficit))
            daily_burn = int(max(200, exercise_deficit))
            # strategy = "Thâm hụt calo 20%: 60% từ ăn uống, 40% từ tập luyện"

        elif goal == 3:  # Gain Muscle
            surplus = max(250, min(tdee * 0.15, 500))
            daily_calo = int(tdee + surplus)
            daily_burn = 300  # calo tập luyện
            # strategy = "Tăng calo 10-15%, tập luyện 300 kcal"

        else:  # Maintain
            daily_calo = tdee
            sedentary_tdee = bmr * 1.2
            estimated_active_calories = tdee - sedentary_tdee
            daily_burn = int(max(200, estimated_active_calories))
            # strategy = "Ăn bằng TDEE, duy trì cân nặng, tập luyện nhẹ"
        return {
            "tdee":tdee,
            "daily_calo": daily_calo,
            "daily_burn": daily_burn,
            # "strategy": strategy
        }
    
    @staticmethod
    def add_metric(user_id, height_cm=None, weight_kg=None, heart_rate=None,
                   blood_pressure_systolic=None, blood_pressure_diastolic=None,
                   activity_level=None, sleep_hours=None, goal=None,
                   has_hypertension=False, has_diabetes=False):
        """Tạo một HealthMetric mới cho user, tự động tính BMI và TDEE nếu có dữ liệu."""
        try:
            user = Account.objects.get(user_id=user_id)
        except Account.DoesNotExist:
            return None

        # Tính BMI
        bmi_value = HealthMetric.calculate_bmi(weight_kg, height_cm)
        # Tính TDEE
        tdee_data = HealthMetric.calculate_tdee(user, weight_kg, height_cm, activity_level,goal)
        
        if tdee_data:
            daily_calo_value = tdee_data["daily_calo"]   # calo ăn
            daily_burn_value = tdee_data["daily_burn"]     # calo tập
            tdee_value = tdee_data["tdee"]                 # TDEE
        else:
            daily_calo_value = 0
            daily_burn_value = 0
            tdee_value = 0

        metric = HealthMetric(
            user=user,
            height_cm=height_cm,
            weight_kg=weight_kg,
            bmi=bmi_value,
            daily_burn = daily_burn_value,
            daily_calo =daily_calo_value,
            tdee=tdee_value,
            heart_rate=heart_rate,
            blood_pressure_systolic=blood_pressure_systolic,
            blood_pressure_diastolic=blood_pressure_diastolic,
            activity_level=activity_level,
            sleep_hours=sleep_hours,
            goal=goal,
            has_hypertension=has_hypertension,
            has_diabetes=has_diabetes
        )
        metric.save()
        return metric
  
           
    
class WeeklyPlans(models.Model):
    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="weekly_plans")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    plan_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"weekly plan {self.id} for {self.user_id.full_name if self.user_id else 'Unknown User'}"

    @staticmethod
    def add_weekly_plan(user_id, start_date=None, end_date=None, plan_data=None):
        try:
            user = Account.objects.get(user_id=user_id)
        except Account.DoesNotExist:
            return None
        if isinstance(start_date, str):
           start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        if isinstance(end_date, str):
           end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        plan = WeeklyPlans(
            user_id=user,
            start_date=start_date,
            end_date=end_date,
            plan_data=plan_data
            )

        plan.save()
        return plan
   
    
class PlanTracking(models.Model):
    ITEM_TYPE_CHOICES = [
        ('exercise', 'Exercise'),
        ('food', 'Food'),
    ]
    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="plan_trackings")
    date = models.DateField(null=True, blank=True)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, null=True, blank=True)
    
    # Giữ nguyên item_id là Integer (Lưu ý: món custom sẽ phải lưu là 0 hoặc Null ở đây)
    item_id = models.IntegerField(null=True, blank=True) 
    
    is_completed = models.BooleanField(default=False)
    weekly_plan = models.ForeignKey('WeeklyPlans', on_delete=models.CASCADE, related_name="trackings", null=True, blank=True)
    
    # --- [MỚI THÊM] ---
    # varchar(50), cho phép NULL, và có Index để tìm kiếm nhanh
    instance_id = models.CharField(max_length=50, null=True, blank=True, db_index=True) 
    # ------------------
    
    created_at = models.DateTimeField(auto_now_add=True)
    
   