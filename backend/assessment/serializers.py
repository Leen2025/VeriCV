from rest_framework import serializers
from .models import Assessment

class AssessmentSerializer(serializers.ModelSerializer):
    top_skills = serializers.SerializerMethodField()
    skills_analyzed_count = serializers.SerializerMethodField()
    missing_keywords = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            "id",
            "kind",
            "position",
            "date_created",
            "average_score",
            "skills_analyzed_count",
            "top_skills",
            "missing_keywords",
        ]

    def get_top_skills(self, obj):
        return obj.top_skills()

    def get_skills_analyzed_count(self, obj):
        if not isinstance(obj.skills_analyzed, dict):
            return 0
        # Count only keys with numeric values to avoid matcher payloads breaking assumptions
        return sum(1 for v in obj.skills_analyzed.values() if isinstance(v, (int, float)))

    def get_missing_keywords(self, obj):
        if obj.kind != "match" or not isinstance(obj.skills_analyzed, dict):
            return []
        keywords = obj.skills_analyzed.get("missing_keywords", [])
        return keywords if isinstance(keywords, list) else []