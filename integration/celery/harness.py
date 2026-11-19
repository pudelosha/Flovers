"""Bounded process/service controls for the disposable cross-process suite."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request
from uuid import uuid4

import redis
from django.conf import settings
from .safety import container_action
from .worker_app import app

ROOT = Path(__file__).resolve().parents[2]
INVITATIONS = "contacts.tasks.deliver_invitation_emails"
NOTIFICATIONS = "profiles.tasks.check_and_send_daily_task_notifications"


def wait_until(check, *, description, timeout=40):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = check()
        if result:
            return result
        time.sleep(0.1)
    raise AssertionError(f"Timed out waiting for {description}")


def wait_redis(client):
    def ready():
        try:
            return client.ping()
        except (redis.ConnectionError, redis.TimeoutError):
            return False
    wait_until(ready, description="isolated Redis recovery")


def mailpit(path):
    with urllib.request.urlopen("http://127.0.0.1:8025/api/v1/" + path, timeout=5) as response:
        return json.load(response)


class Runtime:
    def __init__(self, name):
        self.run = settings.RUN
        self.queue = f"flovers-it-{self.run}-{uuid4().hex[:10]}"
        self.name = name
        self.logs = Path(os.environ.get("FLOVERS_INTEGRATION_LOGS", ROOT / "test-results/celery/processes"))
        self.logs.mkdir(parents=True, exist_ok=True)
        self.redis = redis.Redis.from_url("redis://127.0.0.1:6379/0", socket_timeout=2, socket_connect_timeout=2)
        self.worker = self.beat = None
        self.sequence = 0
        self.temp = tempfile.TemporaryDirectory(prefix="flovers-celery-")

    def spawn(self, kind, args):
        self.sequence += 1
        log = (self.logs / f"{self.name}-{kind}-{self.sequence}.log").open("wb")
        env = os.environ.copy()
        env.update(DJANGO_SETTINGS_MODULE="integration.celery.settings",
                   FLOVERS_INTEGRATION_QUEUE=self.queue,
                   PYTHONPATH=os.pathsep.join([str(ROOT), str(ROOT / "backend")]),
                   PYTHONUNBUFFERED="1")
        process = subprocess.Popen(
            [sys.executable, "-m", "celery", "-A", "integration.celery.worker_app:app", *args],
            cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
        )
        return process, log

    @staticmethod
    def stop_process(entry, *, hard=False):
        if entry is None:
            return
        process, log = entry
        try:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL if hard else signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)
        finally:
            log.close()

    def start_worker(self):
        assert self.worker is None
        self.worker = self.spawn("worker", ["worker", "--loglevel=INFO", "--pool=prefork",
            "--concurrency=1", "--without-gossip", "--without-mingle", "--queues", self.queue,
            "--hostname", f"{self.queue}@localhost"])
        result = self.echo({"startup": self.name})
        assert result["pid"] != os.getpid() and result["eager"] is False
        return result

    def kill_worker(self):
        self.stop_process(self.worker, hard=True)
        self.worker = None

    def start_beat(self):
        assert self.beat is None
        self.beat = self.spawn("beat", ["beat", "--loglevel=INFO", "--max-interval=0.5",
            "--schedule", str(Path(self.temp.name) / "schedule"),
            "--pidfile", str(Path(self.temp.name) / "beat.pid")])

    def send(self, name, *, args=None, kwargs=None, **options):
        return app.send_task(name, args=args or [], kwargs=kwargs or {}, queue=self.queue, **options)

    def echo(self, payload):
        return self.send("flovers.integration.probe", args=[payload]).get(timeout=45)

    def drain(self):
        # One prefork child and prefetch=1: this probe is a completion barrier
        # behind prior queue messages; it does not execute delivery in pytest.
        return self.echo({"barrier": uuid4().hex})

    @contextmanager
    def paused_mailpit(self):
        container = os.environ["FLOVERS_MAILPIT_CONTAINER"]
        container_action(container, run=self.run, role="mailpit", action="pause")
        try:
            yield
        finally:
            container_action(container, run=self.run, role="mailpit", action="unpause")

    def restart_redis(self):
        # Snapshot this disposable broker before restart, so the test explicitly
        # checks a persisted queued message as well as a live consumer reconnect.
        self.redis.save()
        container_action(os.environ["FLOVERS_REDIS_CONTAINER"], run=self.run, role="redis", action="restart")
        self.redis.connection_pool.disconnect()
        wait_redis(self.redis)

    @staticmethod
    def messages(recipient):
        return [m for m in mailpit("messages?limit=1000")["messages"]
                if any(to["Address"] == recipient for to in m["To"])]

    def wait_mail(self, recipient):
        return wait_until(lambda: self.messages(recipient), description="captured synthetic SMTP mail")

    def close(self):
        # Stop publishers first, then consumers, before pytest flushes the DB.
        try:
            self.stop_process(self.beat)
        finally:
            try:
                self.stop_process(self.worker)
            finally:
                self.temp.cleanup()
