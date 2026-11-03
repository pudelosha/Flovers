"""The CI profile must never inherit production services from a developer shell."""
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]


def load_ci(database_url=""):
    code = """import json, os
from app import ci_settings as s
print(json.dumps({'engine':s.DATABASES['default']['ENGINE'],'database':str(s.DATABASES['default']['NAME']),
'email':s.EMAIL_BACKEND,'broker':s.CELERY_BROKER_URL,'eager':s.CELERY_TASK_ALWAYS_EAGER,
'load_dotenv':os.environ['LOAD_DOTENV'],'firebase':os.environ['FCM_SERVICE_ACCOUNT_PATH'],
'media':str(s.MEDIA_ROOT),'private':str(s.PRIVATE_MEDIA_ROOT)}))
"""
    return subprocess.run([sys.executable,"-c",code],cwd=ROOT,capture_output=True,text=True,
        env={**os.environ,"CI_DATABASE_URL":database_url,"DATABASE_URL":"postgres://fake.example/production",
             "APP_ENV":"production","LOAD_DOTENV":"True","THROTTLE_CACHE_URL":"redis://fake.example/0",
             "CELERY_BROKER_URL":"redis://fake.example/1","FCM_SERVICE_ACCOUNT_PATH":"production-secret.json"},timeout=20)


def test_ci_defaults_to_isolated_services_and_temporary_storage():
    result=load_ci()
    assert result.returncode==0,result.stderr
    data=json.loads(result.stdout)
    assert data['engine']=="django.db.backends.sqlite3" and data['database']==":memory:"
    assert data['email']=="django.core.mail.backends.locmem.EmailBackend"
    assert data['broker']=="memory://" and data['eager'] is True
    assert data['load_dotenv']=="False" and data['firebase']==""
    assert not Path(data['media']).is_relative_to(ROOT)
    assert not Path(data['private']).is_relative_to(ROOT)


def test_ci_accepts_only_the_disposable_postgres_database():
    result=load_ci("postgres://flovers_ci:flovers_ci@127.0.0.1:5432/flovers_ci")
    assert result.returncode==0,result.stderr
    data=json.loads(result.stdout)
    assert data['engine']=="django.db.backends.postgresql" and data['database']=="flovers_ci"


@pytest.mark.parametrize("url",["postgres://fake.example/flovers_ci","postgres://127.0.0.1/production","sqlite:///production.sqlite3"])
def test_ci_rejects_external_or_non_test_databases(url):
    result=load_ci(url)
    assert result.returncode!=0 and "loopback flovers_ci database" in result.stderr
