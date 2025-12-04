from django.urls import path
from . import views 

urlpatterns = [
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("verify-token/", views.verify_token_view,name="verify-token"),
    path("user_profile/", views.get_user_frofile, name= "get_user_frofile"),
    path("update_user_profile/", views.update_user_profile, name="update_user_profile"),
    path("post_password/", views.post_passwoord, name="post_name"),
    path("forgot_password/", views.forgot_password, name="forgot_password"),
    path("reset_password/", views.reset_password, name="reset_password")


]