from django.urls import path
from .health import live, ready
from app.urls import urlpatterns as application_urls

urlpatterns = [path("__staging__/live/", live), path("__staging__/ready/", ready), *application_urls]
