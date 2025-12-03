from django.urls import path
from . import views

urlpatterns = [
    path("add_metric/", views.add_metric_view, name="add_metric"),
    path("update/<int:metric_id>/", views.upload_metrics_view, name="update"),
    path("", views.get_analysis_by_user, name="analysis"),
    path("add_weekly_plan/", views.add_weekly_plan, name="add_weekly_plan"),
    path("get_weekly_plans/", views.get_weekly_plans,name = "get_weekly_plans"),
    path("get_plan_tracking/", views.get_plan_tracking, name="get_plan_tracking"),
    path("put_plan_tracking/<int:tracking_id>/", views.put_plan_tracking, name="put_plan_tracking"),
]
