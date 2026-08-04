from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from agencies.models import SecurityAgency, AgencyUser
from admin_panel.models import SystemAdmin


CIVILIAN_USERS = [
    {
        'full_name': 'John Doe',
        'email': 'john@test.com',
        'password': 'password123',
        'phone_number': '+2348011111111',
    },
    {
        'full_name': 'Jane Smith',
        'email': 'jane@test.com',
        'password': 'password123',
        'phone_number': '+2348022222222',
    },
    {
        'full_name': 'Ahmed Musa',
        'email': 'ahmed@test.com',
        'password': 'password123',
        'phone_number': '+2348033333333',
    },
]

AGENCIES = [
    {
        'agency_name': 'Nigerian Police Force',
        'agency_type': 'POLICE',
        'contact_email': 'police@test.com',
        'contact_phone': '+2348012345678',
        'jurisdiction': 'Nationwide',
        'address': 'Force Headquarters, Louis Edet House, Abuja',
        'user_email': 'officer@police.test.com',
        'user_name': 'Police Officer',
        'user_phone': '+2348012345679',
        'user_role': 'DISPATCHER',
    },
    {
        'agency_name': 'Nigerian Army',
        'agency_type': 'MILITARY',
        'contact_email': 'army@test.com',
        'contact_phone': '+2348023456789',
        'jurisdiction': 'Nationwide',
        'address': 'Army Headquarters, Mambilla Barracks, Abuja',
        'user_email': 'officer@army.test.com',
        'user_name': 'Army Officer',
        'user_phone': '+2348023456780',
        'user_role': 'COMMANDER',
    },
    {
        'agency_name': 'Federal Fire Service',
        'agency_type': 'FIRE',
        'contact_email': 'fire@test.com',
        'contact_phone': '+2348034567890',
        'jurisdiction': 'Nationwide',
        'address': 'Federal Fire Service HQ, Abuja',
        'user_email': 'officer@fire.test.com',
        'user_name': 'Fire Officer',
        'user_phone': '+2348034567891',
        'user_role': 'RESPONDER',
    },
    {
        'agency_name': 'National Emergency Management Agency',
        'agency_type': 'MEDICAL',
        'contact_email': 'nema@test.com',
        'contact_phone': '+2348045678901',
        'jurisdiction': 'Nationwide',
        'address': 'NEMA Headquarters, Abuja',
        'user_email': 'officer@nema.test.com',
        'user_name': 'NEMA Officer',
        'user_phone': '+2348045678902',
        'user_role': 'DISPATCHER',
    },
    {
        'agency_name': 'Nigeria Security and Civil Defence Corps',
        'agency_type': 'SECURITY_FORCE',
        'contact_email': 'nscdc@test.com',
        'contact_phone': '+2348056789012',
        'jurisdiction': 'Nationwide',
        'address': 'NSCDC Headquarters, Abuja',
        'user_email': 'officer@nscdc.test.com',
        'user_name': 'NSCDC Officer',
        'user_phone': '+2348056789013',
        'user_role': 'RESPONDER',
    },
]

SYSTEM_ADMIN = {
    'full_name': 'Admin User',
    'email': 'admin@system.com',
    'password': 'admin123',
    'phone_number': '+2348099999999',
    'admin_level': 'SUPER_ADMIN',
}


class Command(BaseCommand):
    help = 'Seed the database with test users, agencies, and admin accounts.'

    def handle(self, *args, **options):
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('  Seeding database...')
        self.stdout.write('=' * 60 + '\n')

        with transaction.atomic():
            civilian_users = self._create_civilians()
            agencies, agency_users = self._create_agencies()
            admin_user = self._create_system_admin()

        self._print_summary(civilian_users, agencies, agency_users, admin_user)

    def _create_civilians(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Creating civilian users...'))
        created = []
        for data in CIVILIAN_USERS:
            user, is_new = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'full_name': data['full_name'],
                    'phone_number': data['phone_number'],
                },
            )
            if is_new:
                user.set_password(data['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(f'  [+] Created user: {user.full_name}'))
            else:
                self.stdout.write(f'  [~] Already exists: {user.full_name}')
            created.append((user, data['password']))
        return created

    def _create_agencies(self):
        self.stdout.write(self.style.MIGRATE_HEADING('\nCreating security agencies and agency users...'))
        agencies = []
        agency_users = []

        for data in AGENCIES:
            agency, is_new = SecurityAgency.objects.get_or_create(
                contact_email=data['contact_email'],
                defaults={
                    'agency_name': data['agency_name'],
                    'agency_type': data['agency_type'],
                    'contact_phone': data['contact_phone'],
                    'jurisdiction': data['jurisdiction'],
                    'address': data['address'],
                    'is_active': True,
                },
            )
            if is_new:
                self.stdout.write(self.style.SUCCESS(f'  [+] Created agency: {agency.agency_name}'))
            else:
                self.stdout.write(f'  [~] Already exists: {agency.agency_name}')
            agencies.append(agency)

            password = 'agency123'
            user, user_is_new = User.objects.get_or_create(
                email=data['user_email'],
                defaults={
                    'full_name': data['user_name'],
                    'phone_number': data['user_phone'],
                },
            )
            if user_is_new:
                user.set_password(password)
                user.save()

            agency_user, au_is_new = AgencyUser.objects.get_or_create(
                user=user,
                defaults={'agency': agency, 'role': data['user_role']},
            )
            if au_is_new:
                self.stdout.write(self.style.SUCCESS(f'       [+] Agency user: {user.full_name} ({data["user_role"]})'))
            agency_users.append((agency, user, data['user_role'], password))

        return agencies, agency_users

    def _create_system_admin(self):
        self.stdout.write(self.style.MIGRATE_HEADING('\nCreating system admin...'))
        data = SYSTEM_ADMIN

        user, is_new = User.objects.get_or_create(
            email=data['email'],
            defaults={
                'full_name': data['full_name'],
                'phone_number': data['phone_number'],
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if is_new:
            user.set_password(data['password'])
            user.save()

        SystemAdmin.objects.get_or_create(
            user=user,
            defaults={'admin_level': data['admin_level']},
        )

        if is_new:
            self.stdout.write(self.style.SUCCESS(f'  [+] Created admin: {user.full_name}'))
        else:
            self.stdout.write(f'  [~] Already exists: {user.full_name}')

        return (user, data['password'])

    def _print_summary(self, civilian_users, agencies, agency_users, admin_user):
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('  SEED COMPLETE — CREDENTIALS SUMMARY')
        self.stdout.write('=' * 60)

        self.stdout.write(self.style.MIGRATE_HEADING('\nCivilian Users:'))
        for user, password in civilian_users:
            self.stdout.write(f'  {user.full_name:<20} {user.email:<25} password: {password}')

        self.stdout.write(self.style.MIGRATE_HEADING('\nAgency Users:'))
        for agency, user, role, password in agency_users:
            self.stdout.write(
                f'  {user.full_name:<20} {user.email:<30} role: {role:<12} password: {password}'
            )

        self.stdout.write(self.style.MIGRATE_HEADING('\nSystem Admin:'))
        admin, password = admin_user
        self.stdout.write(f'  {admin.full_name:<20} {admin.email:<25} password: {password}')

        self.stdout.write('\n' + '=' * 60 + '\n')
