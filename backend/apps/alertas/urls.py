"""Rotas do app alertas."""

from django.urls import path

from .views import AlertaBairroListView, AlertaBairroResolverView
from .whatsapp import WhatsAppWebhookView

app_name = 'alertas'

urlpatterns = [
    path('whatsapp/webhook/', WhatsAppWebhookView.as_view(), name='wa_webhook'),
    path('bairros/', AlertaBairroListView.as_view(), name='alertas_bairros'),
    path('bairros/<int:pk>/resolver/', AlertaBairroResolverView.as_view(), name='alerta_bairro_resolver'),
]
