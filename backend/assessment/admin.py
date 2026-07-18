from django.contrib import admin
from .models import Assessment


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "kind",
        "position",
        "average_score",
        "date_created",
    )

    search_fields = (
        "user__username",
        "user__email",
        "position",
    )

    list_filter = (
        "kind",
        "date_created",
    )

    readonly_fields = (
        "date_created",
    )