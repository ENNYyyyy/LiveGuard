from django.contrib import admin
from .models import SecurityAgency, AgencyUser


@admin.register(SecurityAgency)
class SecurityAgencyAdmin(admin.ModelAdmin):
    list_display = ('agency_name', 'agency_type', 'contact_phone', 'is_active')
    list_filter = ('agency_type', 'is_active')
    search_fields = ('agency_name', 'contact_email', 'jurisdiction')


@admin.register(AgencyUser)
class AgencyUserAdmin(admin.ModelAdmin):
    list_display = ('user', 'agency', 'role')
    list_filter = ('role', 'agency')
    search_fields = ('user__email', 'user__full_name', 'agency__agency_name')
