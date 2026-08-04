import re
from decimal import Decimal
from rest_framework import serializers
from .models import EmergencyAlert, Location, AlertAssignment, Acknowledgment
from notifications.models import NotificationLog
from .priority_engine import (
    RiskAnswerValidationError,
    compute_priority,
    validate_risk_answers,
)

NIGERIAN_PHONE_RE = re.compile(r'^\+234[789][01]\d{8}$|^0[789][01]\d{8}$')


def validate_nigerian_phone(value):
    if value and not NIGERIAN_PHONE_RE.match(value):
        raise serializers.ValidationError(
            "Enter a valid Nigerian phone number (e.g. +2348012345678 or 08012345678)."
        )
    return value


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['location_id', 'latitude', 'longitude', 'accuracy', 'altitude', 'address', 'city', 'state', 'captured_at']
        read_only_fields = ['location_id', 'captured_at']


class AcknowledgmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Acknowledgment
        fields = [
            'ack_id', 'acknowledged_by', 'ack_timestamp',
            'estimated_arrival', 'response_message', 'responder_contact',
        ]
        read_only_fields = ['ack_id', 'ack_timestamp']


class AgencyNestedSerializer(serializers.Serializer):
    agency_name = serializers.CharField()
    agency_type = serializers.CharField()
    contact_phone = serializers.CharField()


class NotificationLogLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = ['channel_type', 'delivery_status', 'sent_at', 'retry_count', 'error_message']


class AlertAssignmentSerializer(serializers.ModelSerializer):
    agency = AgencyNestedSerializer(read_only=True)
    acknowledgment = AcknowledgmentSerializer(read_only=True, allow_null=True)
    alert_id = serializers.IntegerField(source='alert.alert_id', read_only=True)
    alert_type = serializers.CharField(source='alert.alert_type', read_only=True)
    alert_priority_level = serializers.CharField(source='alert.priority_level', read_only=True)
    alert_status = serializers.CharField(source='alert.status', read_only=True)
    alert_updated_at = serializers.DateTimeField(source='alert.updated_at', read_only=True)
    alert_description = serializers.CharField(source='alert.description', read_only=True, allow_null=True)
    reporter_name = serializers.CharField(source='alert.user.full_name', read_only=True, allow_null=True)
    reporter_phone = serializers.CharField(source='alert.user.phone_number', read_only=True, allow_null=True)
    notification_logs = NotificationLogLiteSerializer(source='notifications', many=True, read_only=True)

    class Meta:
        model = AlertAssignment
        fields = [
            'assignment_id', 'alert_id', 'alert_type', 'alert_priority_level', 'alert_status',
            'alert_updated_at',
            'alert_description', 'reporter_name', 'reporter_phone',
            'agency', 'assigned_at',
            'notification_status', 'response_time',
            'assignment_priority', 'acknowledgment', 'notification_logs',
        ]
        read_only_fields = ['assignment_id', 'assigned_at']


class EmergencyAlertCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, write_only=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, write_only=True)
    accuracy = serializers.FloatField(write_only=True, required=False, allow_null=True)
    altitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    city = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True, max_length=100)
    state = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True, max_length=100)
    risk_answers = serializers.JSONField(write_only=True)

    class Meta:
        model = EmergencyAlert
        fields = ['alert_type', 'description', 'risk_answers', 'latitude', 'longitude', 'accuracy', 'altitude', 'city', 'state']

    def validate_alert_type(self, value):
        valid = [choice[0] for choice in EmergencyAlert.ALERT_TYPES]
        if value not in valid:
            raise serializers.ValidationError(f"alert_type must be one of: {', '.join(valid)}.")
        return value

    def validate_latitude(self, value):
        if not (Decimal('-90') <= value <= Decimal('90')):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if not (Decimal('-180') <= value <= Decimal('180')):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate(self, attrs):
        alert_type = attrs.get('alert_type')
        risk_answers = attrs.get('risk_answers')
        try:
            cleaned_answers = validate_risk_answers(alert_type, risk_answers)
        except RiskAnswerValidationError as exc:
            raise serializers.ValidationError({'risk_answers': exc.errors}) from exc

        attrs['risk_answers'] = cleaned_answers
        attrs['_priority_assessment'] = compute_priority(
            alert_type,
            cleaned_answers,
            answers_prevalidated=True,
        )
        return attrs

    def create(self, validated_data):
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        accuracy = validated_data.pop('accuracy', None)
        altitude = validated_data.pop('altitude', None)
        city = validated_data.pop('city', None)
        state = validated_data.pop('state', None)
        validated_data.pop('risk_answers', None)
        priority_assessment = validated_data.pop('_priority_assessment')
        validated_data['priority_level'] = priority_assessment['priority_level']

        alert = EmergencyAlert.objects.create(**validated_data)
        alert.priority_assessment = priority_assessment

        Location.objects.create(
            alert=alert,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            altitude=altitude,
            city=city,
            state=state,
        )

        return alert

    def to_representation(self, instance):
        return EmergencyAlertDetailSerializer(instance, context=self.context).data


class EmergencyAlertDetailSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    assignments = AlertAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = EmergencyAlert
        fields = [
            'alert_id', 'alert_type', 'priority_level', 'description',
            'status', 'rating', 'resolved_at', 'resolved_by',
            'created_at', 'updated_at', 'location', 'assignments',
        ]
        read_only_fields = ['alert_id', 'status', 'rating', 'resolved_at', 'resolved_by', 'created_at', 'updated_at']


class EmergencyAlertListSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)

    class Meta:
        model = EmergencyAlert
        fields = ['alert_id', 'alert_type', 'priority_level', 'status', 'rating', 'created_at', 'location']
        read_only_fields = ['alert_id', 'status', 'rating', 'created_at']
