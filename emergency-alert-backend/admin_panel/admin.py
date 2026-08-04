from django.contrib import admin
from .models import SystemAdmin


@admin.register(SystemAdmin)
class SystemAdminAdmin(admin.ModelAdmin):
    list_display = ('admin_id', 'user', 'admin_level', 'last_login_ip')
    list_filter = ('admin_level',)
    search_fields = ('user__email', 'user__full_name')
