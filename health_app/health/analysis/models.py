from django.db import models
from accounts.models import Account  # liên kết với Account
from datetime import date, datetime, timedelta
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

    def __str__(self):
        return f"{self.user.full_name} - {self.updated_at.strftime('%Y-%m-%d %H:%M:%S')}"
    
    @staticmethod
    def calculate_bmi(weight_kg, height_cm):
        if not weight_kg or not height_cm:
            return None
        return round(float(weight_kg) / ((float(height_cm) / 100) ** 2), 2)

    @staticmethod
    def calculate_tdee(user, weight_kg, height_cm, activity_level):
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
        4: 1.725,
        5: 1.9
       }
        factor = activity_map.get(activity_level, 1.2)
        return int(bmr * factor)
    
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
        tdee_value = HealthMetric.calculate_tdee(user, weight_kg, height_cm, activity_level)

        metric = HealthMetric(
            user=user,
            height_cm=height_cm,
            weight_kg=weight_kg,
            bmi=bmi_value,
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
    
class PlanTracking (models.Model):
    ITEM_TYPE_CHOICES = [
        ('exercise', 'Exercise'),
        ('food', 'Food'),
    ]
    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="plan_trackings")
    date  = models.DateField(null=True, blank=True)
    item_type  = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES,null=True, blank=True)
    item_id = models.IntegerField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    weekly_plan = models.ForeignKey(WeeklyPlans, on_delete=models.CASCADE, related_name="trackings", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @staticmethod
    def add_plan_tracking (weekly_plan):
        user = weekly_plan.user_id
        plan_data  = weekly_plan.plan_data or {}
        meal_plan = plan_data.get("meal_plan", {})
        workout_plan = plan_data.get("workout_plan", {})
        days_offset = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6,
    }
        for day_name in ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]:
            day_date = weekly_plan.start_date + timedelta(days=days_offset[day_name])
            
            if day_name in meal_plan:
                for meal_type, meal_info in meal_plan[day_name].items():
                    if meal_type =="total_calories":
                        continue
                    PlanTracking.objects.create(
                        user_id = user,
                        date = day_date,
                        item_type = "food",
                        item_id = meal_info.get("id"),
                        weekly_plan = weekly_plan
                    )
            if day_name in workout_plan:
                for exercise in workout_plan[day_name].get("exercises", []):
                    PlanTracking.objects.create(
                        user_id = user,
                        date = day_date,
                        item_type = "exercise",
                        item_id = exercise.get("id"),
                        weekly_plan = weekly_plan
                    )
            