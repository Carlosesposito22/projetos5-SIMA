"""Rotas do app alertas."""

from django.urls import path
from .whatsapp import WhatsAppWebhookView

app_name = 'alertas'

urlpatterns = [
    path(
        'whatsapp/webhook/',
        WhatsAppWebhookView.as_view(),
        name='wa_webhook',
    ),
]
