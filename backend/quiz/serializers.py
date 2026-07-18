from rest_framework import serializers
from .models import Quiz, Question, Result

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['user', 'created_at'] # It prevents frontend or Postman users from trying to overwrite the user manually.

class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Result
        fields = '__all__'
        read_only_fields = ['user', 'completed_at']
