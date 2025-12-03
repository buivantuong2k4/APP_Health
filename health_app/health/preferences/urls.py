from django.urls import path

from preferences import views


urlpatterns=[
path("post_preference_food/", views.add_food_preference, name="post_preference_food"),
path("put_preference_food/<int:food_preference_id>/", views.update_food_preference, name="put_preference_food"),   
path("delete_preference_food/<int:food_preference_id>/", views.delete_food_preference, name="delete_preference_food"),   
path("post_preference_exercise/", views.add_exercise_preference, name="post_preference_exercise"),
path("put_preference_exercise/<int:exercise_preference_id>/", views.update_exercise_preference, name="put_preference_exercise"),   
path("delete_preference_exercise/<int:exercise_preference_id>/", views.delete_exercise_preference, name="delete_preference_exercise"), 

]