# api/urls.py
from django.urls import path
from .views import (
    SuggestionView, GeneratePlanView, SavePlanView, 
    TrackItemView, CurrentPlanView
)

urlpatterns = [
    path('selection/suggestions', SuggestionView.as_view()),
    path('plan/preview', GeneratePlanView.as_view()),
    path('plan/save', SavePlanView.as_view()),
    path('plan/track', TrackItemView.as_view()),
    path('plan/current', CurrentPlanView.as_view()),
]