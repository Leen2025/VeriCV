from django.contrib import admin
from .models import CV


@admin.register(CV)
class CVAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "uploaded_at")
    search_fields = ("title", "user__username", "user__email")
    list_filter = ("uploaded_at",)
    readonly_fields = ("uploaded_at",)