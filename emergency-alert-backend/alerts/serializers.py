import re
from decimal import Decimal
from rest_framework import serializers
from .models import EmergencyAlert, Location, AlertAssignment, Acknowledgment

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
        fields = ['location_id', 'latitude', 'longitude', 'accuracy', 'address', 'captured_at']
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


class AlertAssignmentSerializer(serializers.ModelSerializer):
    agency = AgencyNestedSerializer(read_only=True)
    acknowledgment = AcknowledgmentSerializer(read_only=True, allow_null=True)

    class Meta:
        model = AlertAssignment
        fields = [
            'assignment_id', 'agency', 'assigned_at',
            'notification_status', 'response_time',
            'assignment_priority', 'acknowledgment',
        ]
        read_only_fields = ['assignment_id', 'assigned_at']


class EmergencyAlertCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, write_only=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, write_only=True)
    accuracy = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = EmergencyAlert
        fields = ['alert_type', 'priority_level', 'description', 'latitude', 'longitude', 'accuracy']

    def validate_alert_type(self, value):
        valid = [choice[0] for choice in EmergencyAlert.ALERT_TYPES]
        if value not in valid:
            raise serializers.ValidationError(f"alert_type must be one of: {', '.join(valid)}.")
        return value

    def validate_priority_level(self, value):
        valid = [choice[0] for choice in EmergencyAlert.PRIORITY_LEVELS]
        if value not in valid:
            raise serializers.ValidationError(f"priority_level must be one of: {', '.join(valid)}.")
        return value

    def validate_latitude(self, value):
        if not (Decimal('-90') <= value <= Decimal('90')):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if not (Decimal('-180') <= value <= Decimal('180')):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def create(self, validated_data):
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        accuracy = validated_data.pop('accuracy', None)

        alert = EmergencyAlert.objects.create(**validated_data)

        Location.objects.create(
            alert=alert,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
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
            'status', 'rating', 'created_at', 'updated_at', 'location', 'assignments',
        ]
        read_only_fields = ['alert_id', 'status', 'rating', 'created_at', 'updated_at']


class EmergencyAlertListSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)

    class Meta:
        model = EmergencyAlert
        fields = ['alert_id', 'alert_type', 'priority_level', 'status', 'rating', 'created_at', 'location']
        read_only_fields = ['alert_id', 'status', 'rating', 'created_at']
