from rest_framework import serializers
from .models import SecurityAgency
from alerts.models import Acknowledgment


class SecurityAgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityAgency
        fields = [
            'agency_id', 'agency_name', 'agency_type',
            'contact_email', 'contact_phone', 'jurisdiction', 'is_active',
        ]
        read_only_fields = ['agency_id']


class AcknowledgeAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Acknowledgment
        fields = [
            'acknowledged_by', 'estimated_arrival',
            'response_message', 'responder_contact',
        ]
