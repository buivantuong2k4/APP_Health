from django.db import models
from accounts.models import Account

class Food(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    calories = models.IntegerField(null=True, blank=True)
    protein_g = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fat_g = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    carbs_g = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)  # e.g., fruit, vegetable, grain
    target_goal = models.PositiveSmallIntegerField(null=True, blank=True)  # tinyint(4)
    contra_hypertension = models.BooleanField(default=False)
    contra_diabetes = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    suitable_for = models.CharField(max_length=100, default="trua,toi")
    
    def __str__(self):
        return self.name

class UserFoodPreferences(models.Model):
    PREFERENCE_TYPE_CHOICES = [
    ('Like', 'Like'),
    ('Dislike', 'Dislike'),
]

    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="food_preferences")
    food_id = models.ForeignKey(Food, on_delete=models.CASCADE, related_name="user_preferences")
    preference_type = models.CharField(max_length=10,choices=PREFERENCE_TYPE_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.user_id.full_name} - {self.food_id.name}"
    @staticmethod
    def add_preference_food(user_id=None, food_id=None, preference_type=None):
        try: 
            user = Account.objects.get(user_id=user_id)
            food = Food.objects.get(id=food_id)
        except (Account.DoesNotExist, Food.DoesNotExist):
            return None    

        food_preference = UserFoodPreferences(
            user_id=user,
            food_id=food,
            preference_type=preference_type
        )
        food_preference.save()
        return food_preference

    
class Exercise(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    intensity = models.PositiveSmallIntegerField(null=True, blank=True)  # tinyint
    calories_burn_30min = models.IntegerField(null=True, blank=True)
    target_goal = models.PositiveSmallIntegerField(null=True, blank=True)
    min_age = models.IntegerField(default=12)
    max_age = models.IntegerField(default=80)
    contra_hypertension = models.BooleanField(default=False)
    contra_heart_disease = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name
    
class UserExercisePreferences(models.Model):
    PREFERENCE_TYPE_CHOICES = [
        (True, 'Like'),
        (False, 'Dislike'),
    ]                           
    user_id = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="exercise_preferences")
    exercise_id = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="user_preferences")
    preference_type = models.CharField(max_length=10, choices=PREFERENCE_TYPE_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.user_id.full_name} - {self.exercise_id.name}"
    
    @staticmethod
    def add_preference_exercide(user_id=None, exercise_id=None, preference_type=None):
        try: 
            user = Account.objects.get(user_id=user_id)
            exercise = Exercise.objects.get(id=exercise_id)
        except (Account.DoesNotExist, Exercise.DoesNotExist):
            return None    

        exercise_preference = UserExercisePreferences(
            user_id=user,
            exercise_id=exercise,
            preference_type=preference_type
        )
        exercise_preference.save()
        return exercise_preference