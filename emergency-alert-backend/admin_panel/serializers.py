from rest_framework import serializers
from agencies.models import SecurityAgency, AgencyUser
from alerts.models import EmergencyAlert, AlertAssignment, Acknowledgment
from accounts.models import User


# ─── Agency ───────────────────────────────────────────────────────────────────

class AgencyStaffSerializer(serializers.ModelSerializer):
    user_id      = serializers.IntegerField(source='user.user_id', read_only=True)
    full_name    = serializers.CharField(source='user.full_name', read_only=True)
    email        = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model  = AgencyUser
        fields = ['user_id', 'full_name', 'email', 'phone_number', 'role']


class AgencyListSerializer(serializers.ModelSerializer):
    staff_count        = serializers.SerializerMethodField()
    active_alert_count = serializers.SerializerMethodField()

    class Meta:
        model  = SecurityAgency
        fields = [
            'agency_id', 'agency_name', 'agency_type', 'contact_email',
            'contact_phone', 'jurisdiction', 'address', 'is_active',
            'operational_capacity', 'staff_count', 'active_alert_count',
        ]

    def get_staff_count(self, obj):
        return obj.staff.count()

    def get_active_alert_count(self, obj):
        return obj.assignments.filter(
            alert__status__in=['DISPATCHED', 'ACKNOWLEDGED', 'RESPONDING']
        ).count()


class AgencyDetailSerializer(AgencyListSerializer):
    staff = AgencyStaffSerializer(many=True, read_only=True)

    class Meta(AgencyListSerializer.Meta):
        fields = AgencyListSerializer.Meta.fields + ['staff']


class AgencyCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SecurityAgency
        fields = [
            'agency_name', 'agency_type', 'contact_email', 'contact_phone',
            'jurisdiction', 'address', 'operational_capacity', 'is_active',
        ]


# ─── Alert ────────────────────────────────────────────────────────────────────

class UserNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['user_id', 'full_name', 'email', 'phone_number']


class AcknowledgmentAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Acknowledgment
        fields = [
            'ack_id', 'acknowledged_by', 'ack_timestamp',
            'estimated_arrival', 'response_message', 'responder_contact',
        ]


class AssignmentAdminSerializer(serializers.ModelSerializer):
    agency_id   = serializers.IntegerField(source='agency.agency_id', read_only=True)
    agency_name = serializers.CharField(source='agency.agency_name', read_only=True)
    agency_type = serializers.CharField(source='agency.agency_type', read_only=True)
    acknowledgment = AcknowledgmentAdminSerializer(read_only=True, allow_null=True)

    class Meta:
        model  = AlertAssignment
        fields = [
            'assignment_id', 'agency_id', 'agency_name', 'agency_type',
            'assigned_at', 'notification_status', 'response_time',
            'assignment_priority', 'acknowledgment',
        ]


class AlertListAdminSerializer(serializers.ModelSerializer):
    reporter         = UserNestedSerializer(source='user', read_only=True)
    address          = serializers.CharField(source='location.address', default=None, read_only=True)
    latitude         = serializers.DecimalField(
        source='location.latitude', max_digits=10, decimal_places=7, default=None, read_only=True
    )
    longitude        = serializers.DecimalField(
        source='location.longitude', max_digits=10, decimal_places=7, default=None, read_only=True
    )
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model  = EmergencyAlert
        fields = [
            'alert_id', 'alert_type', 'priority_level', 'status',
            'created_at', 'updated_at', 'reporter',
            'address', 'latitude', 'longitude', 'assignment_count',
        ]

    def get_assignment_count(self, obj):
        return obj.assignments.count()


class AlertDetailAdminSerializer(serializers.ModelSerializer):
    reporter    = UserNestedSerializer(source='user', read_only=True)
    location    = serializers.SerializerMethodField()
    assignments = AssignmentAdminSerializer(many=True, read_only=True)

    class Meta:
        model  = EmergencyAlert
        fields = [
            'alert_id', 'alert_type', 'priority_level', 'description',
            'status', 'created_at', 'updated_at',
            'reporter', 'location', 'assignments',
        ]

    def get_location(self, obj):
        loc = getattr(obj, 'location', None)
        if not loc:
            return None
        return {
            'latitude':  str(loc.latitude),
            'longitude': str(loc.longitude),
            'accuracy':  loc.accuracy,
            'address':   loc.address,
            'maps_url':  f"https://maps.google.com/?q={loc.latitude},{loc.longitude}",
        }


# ─── Users ────────────────────────────────────────────────────────────────────

class CivilianUserSerializer(serializers.ModelSerializer):
    alert_count = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['user_id', 'full_name', 'email', 'phone_number', 'date_joined', 'alert_count']

    def get_alert_count(self, obj):
        return obj.alerts.count()
