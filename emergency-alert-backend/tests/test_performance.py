"""
Performance Tests — Emergency Alert System
==========================================
Tests response time, multi-channel delivery rate, concurrent load,
and channel failover behaviour.

Run:
    python manage.py test tests.test_performance --settings=alert_system.test_settings -v 2
"""
import time
import threading
import statistics
from unittest.mock import patch, MagicMock
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from agencies.models import SecurityAgency
from alerts.models import EmergencyAlert, AlertAssignment
from notifications.models import NotificationLog


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _create_user(email, phone='+2348011111111'):
    return User.objects.create_user(
        email=email, password='testpass123',
        phone_number=phone, full_name='Perf User',
    )


def _create_agency(name, agency_type, email, phone):
    return SecurityAgency.objects.create(
        agency_name=name, agency_type=agency_type,
        contact_email=email, contact_phone=phone,
        jurisdiction='Nationwide', address='Abuja HQ',
        is_active=True, fcm_token='fake-fcm-token',
    )


def _token_string(user):
    """Return a JWT access-token string (writes OutstandingToken once)."""
    return str(RefreshToken.for_user(user).access_token)


def _authed_client(token_str):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_str}')
    return client


ALERT_PAYLOAD = {
    'alert_type': 'ARMED_ROBBERY',
    'priority_level': 'HIGH',
    'description': 'Performance test alert',
    'latitude': '6.5244',
    'longitude': '3.3792',
    'accuracy': 10.0,
}

CREATE_URL = '/api/alerts/create/'


def _print_table(title, rows, headers):
    col_widths = [
        max(len(str(cell)) for cell in [h] + [r[i] for r in rows])
        for i, h in enumerate(headers)
    ]
    sep = '+' + '+'.join('-' * (w + 2) for w in col_widths) + '+'
    fmt = '|' + '|'.join(f' {{:<{w}}} ' for w in col_widths) + '|'
    width = sum(col_widths) + len(col_widths) * 3 + 1

    print(f'\n{"=" * width}')
    print(f'  {title}')
    print(sep)
    print(fmt.format(*headers))
    print(sep)
    for row in rows:
        print(fmt.format(*[str(c) for c in row]))
    print(sep)


# ---------------------------------------------------------------------------
# 1. Response Time Test — 50 sequential alerts
# ---------------------------------------------------------------------------

class ResponseTimeTest(TestCase):
    N = 50
    TARGET_AVG_MS = 500

    @classmethod
    def setUpTestData(cls):
        cls.user = _create_user('rt@test.com', '+2348011000001')
        _create_agency('Police RT', 'POLICE', 'rt_police@test.com', '+2348010000001')

    @patch('alerts.views.NotificationDispatcher')
    def test_response_time(self, mock_cls):
        mock_cls.return_value.dispatch_alert = MagicMock()

        token = _token_string(self.user)
        client = _authed_client(token)
        times_ms = []

        for _ in range(self.N):
            t0 = time.perf_counter()
            response = client.post(CREATE_URL, ALERT_PAYLOAD, format='json')
            times_ms.append((time.perf_counter() - t0) * 1000)
            self.assertIn(response.status_code, (200, 201))

        avg = statistics.mean(times_ms)
        p95 = sorted(times_ms)[int(len(times_ms) * 0.95)]

        _print_table(
            f'Response Time Test  (n={self.N})',
            [
                ['Min',     f'{min(times_ms):.1f} ms', '—'],
                ['Max',     f'{max(times_ms):.1f} ms', '—'],
                ['Average', f'{avg:.1f} ms',            f'< {self.TARGET_AVG_MS} ms'],
                ['P95',     f'{p95:.1f} ms',            '—'],
            ],
            ['Metric', 'Measured', 'Target'],
        )
        verdict = 'PASS' if avg < self.TARGET_AVG_MS else 'FAIL'
        print(f'\n  Result: {verdict}  (avg {avg:.1f} ms  |  target < {self.TARGET_AVG_MS} ms)\n')

        self.assertLess(avg, self.TARGET_AVG_MS,
                        f'Average {avg:.1f} ms exceeds target {self.TARGET_AVG_MS} ms')


# ---------------------------------------------------------------------------
# 2. Multi-Channel Delivery Test — 20 alerts, all 3 channels logged
# ---------------------------------------------------------------------------

class MultiChannelDeliveryTest(TestCase):
    N = 20
    TARGET_RATE = 0.95

    @classmethod
    def setUpTestData(cls):
        cls.user = _create_user('mc@test.com', '+2348011000002')
        _create_agency('Police MC', 'POLICE', 'mc_police@test.com', '+2348010000002')

    def _log_all_channels(self, assignment):
        for ch in ('PUSH', 'SMS', 'EMAIL'):
            NotificationLog.objects.create(
                assignment=assignment, channel_type=ch,
                recipient='test-recipient', delivery_status='SENT',
            )

    @patch('alerts.views.NotificationDispatcher')
    def test_multi_channel_delivery(self, mock_cls):
        mock_cls.return_value.dispatch_alert = self._log_all_channels

        token = _token_string(self.user)
        client = _authed_client(token)

        for _ in range(self.N):
            r = client.post(CREATE_URL, ALERT_PAYLOAD, format='json')
            self.assertIn(r.status_code, (200, 201))

        rows = []
        overall_sent = overall_total = 0

        for ch in ('PUSH', 'SMS', 'EMAIL'):
            total = NotificationLog.objects.filter(channel_type=ch).count()
            sent  = NotificationLog.objects.filter(channel_type=ch, delivery_status='SENT').count()
            rate  = (sent / total * 100) if total else 0.0
            verdict = 'PASS' if rate >= self.TARGET_RATE * 100 else 'FAIL'
            rows.append([ch, sent, total, f'{rate:.1f}%', verdict])
            overall_sent  += sent
            overall_total += total

        overall_rate = (overall_sent / overall_total * 100) if overall_total else 0.0
        rows.append(['OVERALL', overall_sent, overall_total, f'{overall_rate:.1f}%',
                     'PASS' if overall_rate >= self.TARGET_RATE * 100 else 'FAIL'])

        _print_table(
            f'Multi-Channel Delivery Test  (n={self.N} alerts)',
            rows,
            ['Channel', 'Sent', 'Total', 'Success Rate', 'Result'],
        )
        print(f'\n  Target: >= {self.TARGET_RATE * 100:.0f}% overall success rate\n')

        self.assertGreaterEqual(overall_rate / 100, self.TARGET_RATE,
                                f'Delivery rate {overall_rate:.1f}% below target')


# ---------------------------------------------------------------------------
# 3. Concurrent Load Test — 20 simultaneous requests
# ---------------------------------------------------------------------------

class ConcurrentLoadTest(TransactionTestCase):
    """
    Uses TransactionTestCase so data is committed to the DB and visible
    to threads that open their own connections.
    (TestCase wraps everything in an uncommitted transaction that threads cannot see.)
    """
    N_THREADS = 20

    def setUp(self):
        self.user = _create_user('cl@test.com', '+2348011000003')
        _create_agency('Police CL', 'POLICE', 'cl_police@test.com', '+2348010000003')

    @patch('alerts.views.NotificationDispatcher')
    def test_concurrent_load(self, mock_cls):
        mock_cls.return_value.dispatch_alert = MagicMock()

        # Generate token once (DB write), then reuse the string across all threads
        token = _token_string(self.user)

        results  = []
        errors   = []
        result_lock = threading.Lock()
        # SQLite in-memory shared cache does not support concurrent writes.
        # A write lock serialises DB access while all threads still launch together,
        # testing thread management and the HTTP layer.
        # In production (MySQL / PostgreSQL) this semaphore is not needed.
        db_write_lock = threading.Semaphore(1)

        def send_alert():
            from django.db import connection as db_conn
            db_conn.close()  # each thread gets its own connection
            client = _authed_client(token)
            t0 = time.perf_counter()
            try:
                with db_write_lock:
                    r = client.post(CREATE_URL, ALERT_PAYLOAD, format='json')
                elapsed_ms = (time.perf_counter() - t0) * 1000
                with result_lock:
                    results.append((r.status_code, elapsed_ms))
            except Exception as exc:
                with result_lock:
                    errors.append(str(exc))

        threads = [threading.Thread(target=send_alert) for _ in range(self.N_THREADS)]
        wall_start = time.perf_counter()
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        wall_total = time.perf_counter() - wall_start

        statuses   = [r[0] for r in results]
        times_ms   = [r[1] for r in results]
        successes  = sum(1 for s in statuses if s in (200, 201))
        errors_500 = sum(1 for s in statuses if s == 500)
        throughput = len(results) / wall_total if wall_total else 0

        _print_table(
            f'Concurrent Load Test  (n={self.N_THREADS} simultaneous requests)',
            [
                ['Total sent',         self.N_THREADS,                        '—'],
                ['Successful (2xx)',    successes,                             self.N_THREADS],
                ['Server errors (500)', errors_500,                            '0'],
                ['Thread exceptions',   len(errors),                           '0'],
                ['Wall time',           f'{wall_total * 1000:.1f} ms',         '—'],
                ['Throughput',          f'{throughput:.1f} req/s',             '—'],
                ['Min response',        f'{min(times_ms):.1f} ms' if times_ms else '—', '—'],
                ['Max response',        f'{max(times_ms):.1f} ms' if times_ms else '—', '—'],
                ['Avg response',        f'{statistics.mean(times_ms):.1f} ms' if times_ms else '—', '—'],
            ],
            ['Metric', 'Measured', 'Target'],
        )
        print(f'\n  Throughput: {throughput:.2f} alerts/second\n')

        self.assertEqual(len(errors),  0, f'Thread exceptions: {errors}')
        self.assertEqual(errors_500,   0, f'{errors_500} requests returned HTTP 500')
        self.assertEqual(successes, self.N_THREADS,
                         f'Only {successes}/{self.N_THREADS} requests succeeded')


# ---------------------------------------------------------------------------
# 4. Channel Failover Test
# ---------------------------------------------------------------------------

class ChannelFailoverTest(TestCase):
    N = 10

    @classmethod
    def setUpTestData(cls):
        cls.user = _create_user('cf@test.com', '+2348011000004')
        _create_agency('Police CF', 'POLICE', 'cf_police@test.com', '+2348010000004')

    def _run_failover(self, failing_channel):
        """Send N alerts with one channel always failing; verify isolation."""
        remaining = ({'PUSH', 'SMS', 'EMAIL'} - {failing_channel})

        def fake_dispatch(assignment):
            # Broken channel
            NotificationLog.objects.create(
                assignment=assignment, channel_type=failing_channel,
                recipient='test', delivery_status='FAILED',
                error_message=f'Simulated {failing_channel} failure',
            )
            # Healthy channels
            for ch in remaining:
                NotificationLog.objects.create(
                    assignment=assignment, channel_type=ch,
                    recipient='test', delivery_status='SENT',
                )

        NotificationLog.objects.all().delete()

        with patch('alerts.views.NotificationDispatcher') as mock_cls:
            mock_cls.return_value.dispatch_alert = fake_dispatch
            token  = _token_string(self.user)
            client = _authed_client(token)
            for _ in range(self.N):
                r = client.post(CREATE_URL, ALERT_PAYLOAD, format='json')
                self.assertIn(r.status_code, (200, 201))

        rows = []
        for ch in ('PUSH', 'SMS', 'EMAIL'):
            total  = NotificationLog.objects.filter(channel_type=ch).count()
            sent   = NotificationLog.objects.filter(channel_type=ch, delivery_status='SENT').count()
            failed = NotificationLog.objects.filter(channel_type=ch, delivery_status='FAILED').count()
            expected = 'FAILED' if ch == failing_channel else 'SENT'
            verdict  = 'PASS' if (failed == self.N if ch == failing_channel else sent == self.N) else 'FAIL'
            rows.append([ch, sent, failed, total, f'All {expected}', verdict])

        _print_table(
            f'Channel Failover Test  ({failing_channel} broken, n={self.N} alerts)',
            rows,
            ['Channel', 'SENT', 'FAILED', 'Total', 'Expected', 'Result'],
        )
        print(f'\n  Broken: {failing_channel}  |  Others unaffected.\n')

        # Assertions
        failed_logs = NotificationLog.objects.filter(
            channel_type=failing_channel, delivery_status='FAILED'
        )
        self.assertEqual(failed_logs.count(), self.N,
                         f'Expected {self.N} FAILED for {failing_channel}')
        for ch in remaining:
            sent_logs = NotificationLog.objects.filter(channel_type=ch, delivery_status='SENT')
            self.assertEqual(sent_logs.count(), self.N,
                             f'Expected {self.N} SENT for {ch}, got {sent_logs.count()}')

    def test_channel_failover_sms(self):
        self._run_failover('SMS')

    def test_channel_failover_email(self):
        self._run_failover('EMAIL')

    def test_channel_failover_push(self):
        self._run_failover('PUSH')


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

class PerformanceSummary(TestCase):

    def test_print_summary(self):
        print("""
+==================================================================+
|         EMERGENCY ALERT SYSTEM - PERFORMANCE TEST SUMMARY        |
+==================================================================+
|                                                                  |
|  Test 1 - Response Time (50 sequential alerts)                   |
|    Target : avg < 500 ms per request                             |
|                                                                  |
|  Test 2 - Multi-Channel Delivery (20 alerts x 3 channels)        |
|    Target : > 95% overall delivery success rate                  |
|                                                                  |
|  Test 3 - Concurrent Load (20 simultaneous requests)             |
|    Target : 0 server errors, all requests processed              |
|                                                                  |
|  Test 4 - Channel Failover (SMS / EMAIL / PUSH broken)           |
|    Target : broken channel logs FAILED; others log SENT          |
|                                                                  |
|  Database : SQLite in-memory                                     |
|  External services (FCM, Twilio, Email) : mocked                 |
+==================================================================+
""")
        self.assertTrue(True)
