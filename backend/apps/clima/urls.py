from django.urls import path
from . import views

app_name = "clima"

urlpatterns = [
    path("atual/", views.ClimaAtualView.as_view(), name="atual"),
]
