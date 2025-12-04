from django.db import models
from accounts.models import Account
from datetime import date, datetime
from django.utils import timezone


# ============================================
# HEALTH METRIC
# ============================================
class HealthMetric(models.Model):
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="metrics")
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    tdee = models.IntegerField(null=True, blank=True)
    blood_pressure_systolic = models.SmallIntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.SmallIntegerField(null=True, blank=True)
    heart_rate = models.SmallIntegerField(null=True, blank=True)
    activity_level = models.SmallIntegerField(null=True, blank=True)  # 1–4
    sleep_hours = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    goal = models.SmallIntegerField(null=True, blank=True)
    has_hypertension = models.BooleanField(default=False)
    has_diabetes = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    daily_burn = models.IntegerField(null=True, blank=True)
    daily_calo = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.updated_at.strftime('%Y-%m-%d %H:%M:%S')}"

    # ===============================================
    # TÍNH BMI
    # ===============================================
    @staticmethod
    def calculate_bmi(weight_kg, height_cm):
        if not weight_kg or not height_cm:
            return None
        return round(float(weight_kg) / ((float(height_cm) / 100) ** 2), 2)

    # ===============================================
    # TÍNH TDEE + CHIẾN LƯỢC ĂN / TẬP
    # ===============================================
    @staticmethod
    def calculate_tdee(user, weight_kg, height_cm, activity_level, goal):
        # Validate input
        if not (
            user and weight_kg and height_cm and
            hasattr(user, "date_of_birth") and user.date_of_birth and
            hasattr(user, "gender") and user.gender
        ):
            return None

        # ---- AGE ----
        today = date.today()
        age = today.year - user.date_of_birth.year - (
            (today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day)
        )

        weight = float(weight_kg)
        height = float(height_cm)

        # ---- BMR ---- (Mifflin–St Jeor)
        if user.gender.lower() == "male":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161

        # ---- ACTIVITY FACTOR ----
        activity_map = {
            1: 1.2,
            2: 1.375,
            3: 1.55,
            4: 1.725,
        }
        factor = activity_map.get(activity_level, 1.2)
        tdee = int(round(bmr * factor))

        # Helper clamp
        def clamp(v, low, high):
            return max(low, min(v, high))

        daily_calo = 0
        daily_burn = 0

        # ========================================
        # 1️⃣ GIẢM CÂN
        # ========================================
        if goal == 1:
            raw_deficit = tdee * 0.2
            total_deficit = clamp(raw_deficit, 300, 800)

            net_goal = tdee - total_deficit

            # Không để net thấp hơn 90% BMR
            min_safe_net = bmr * 0.9
            if net_goal < min_safe_net:
                net_goal = min_safe_net
                total_deficit = tdee - net_goal

            diet_deficit = total_deficit * 0.6
            exercise_deficit = total_deficit * 0.4

            daily_burn = int(max(200, exercise_deficit))
            daily_calo = int(round(net_goal + daily_burn))

        # ========================================
        # 3️⃣ TĂNG CÂN
        # ========================================
        elif goal == 3:
            raw_surplus = tdee * 0.15
            surplus = clamp(raw_surplus, 250, 500)

            net_goal = tdee + surplus

            if activity_level <= 1:
                daily_burn = 250
            elif activity_level == 2:
                daily_burn = 300
            elif activity_level == 3:
                daily_burn = 350
            else:
                daily_burn = 400

            daily_calo = int(round(net_goal + daily_burn))

        # ========================================
        # 2️⃣ GIỮ CÂN
        # ========================================
        else:
            net_goal = tdee

            if activity_level <= 1:
                daily_burn = 200
            elif activity_level == 2:
                daily_burn = 250
            elif activity_level == 3:
                daily_burn = 300
            else:
                daily_burn = 350

            daily_calo = int(round(net_goal + daily_burn))

        return {
            "tdee": int(tdee),
            "daily_calo": int(daily_calo),
            "daily_burn": int(daily_burn),
        }

    # ============================================
    # THÊM METRIC
    # ============================================
    @staticmethod
    def add_metric(
        user_id, height_cm=None, weight_kg=None, heart_rate=None,
        blood_pressure_systolic=None, blood_pressure_diastolic=None,
        activity_level=None, sleep_hours=None, goal=None,
        has_hypertension=False, has_diabetes=False
    ):
        try:
            user = Account.objects.get(user_id=user_id)
        except Account.DoesNotExist:
            return None

        bmi_value = HealthMetric.calculate_bmi(weight_kg, height_cm)
        tdee_data = HealthMetric.calculate_tdee(user, weight_kg, height_cm, activity_level, goal)

        if tdee_data:
            daily_calo_value = tdee_data["daily_calo"]
            daily_burn_value = tdee_data["daily_burn"]
            tdee_value = tdee_data["tdee"]
        else:
            daily_calo_value = 0
            daily_burn_value = 0
            tdee_value = 0

        metric = HealthMetric(
            user=user,
            height_cm=height_cm,
            weight_kg=weight_kg,
            bmi=bmi_value,
            daily_burn=daily_burn_value,
            daily_calo=daily_calo_value,
            tdee=tdee_value,
            heart_rate=heart_rate,
            blood_pressure_systolic=blood_pressure_systolic,
            blood_pressure_diastolic=blood_pressure_diastolic,
            activity_level=activity_level,
            sleep_hours=sleep_hours,
            goal=goal,
            has_hypertension=has_hypertension,
            has_diabetes=has_diabetes,
        )
        metric.save()
        return metric


# ============================================
# WEEKLY PLAN
# ============================================
class WeeklyPlans(models.Model):
    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="weekly_plans")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    plan_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Weekly Plan {self.id} for {self.user_id.full_name if self.user_id else 'Unknown'}"

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
            plan_data=plan_data,
        )
        plan.save()
        return plan


# ============================================
# PLAN TRACKING
# ============================================
class PlanTracking(models.Model):
    ITEM_TYPE_CHOICES = [
        ("exercise", "Exercise"),
        ("food", "Food"),
    ]

    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="plan_trackings")
    date = models.DateField(null=True, blank=True)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, null=True, blank=True)
    item_id = models.IntegerField(null=True, blank=True)  # food/exercise id
    is_completed = models.BooleanField(default=False)
    weekly_plan = models.ForeignKey("WeeklyPlans", on_delete=models.CASCADE, related_name="trackings", null=True, blank=True)

    instance_id = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
