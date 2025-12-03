from django.db import models
from django.contrib.auth.hashers import check_password, make_password


class Account(models.Model):
    user_id = models.BigAutoField(primary_key=True)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    # def set_password(self, raw_password):
    #     hashed = hashlib.sha256(raw_password.encode('utf-8')).hexdigest()
    #     self.password_hash = hashed

    # def check_password(self, raw_password):
    #     hashed = hashlib.sha256(raw_password.encode('utf-8')).hexdigest()
    #     return self.password_hash == hashed
    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)

    def __str__(self):
        return self.full_name
   