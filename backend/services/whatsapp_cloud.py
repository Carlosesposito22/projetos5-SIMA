"""Cliente da WhatsApp Cloud API (Meta).

Encapsula o envio de mensagens template e texto livre. Token e phone_number_id
vêm de settings (carregados via django-environ a partir de .env).

Documentação oficial:
https://developers.facebook.com/docs/whatsapp/cloud-api
"""

# from django.conf import settings
# import requests


def enviar_alerta(telefone: str, mensagem: str) -> dict:
    """Dispara um alerta de alagamento para um telefone via WhatsApp.

    A ser implementado em sprint dedicada à integração com a Meta.
    """
    raise NotImplementedError('Pendente: configurar app no Meta for Developers')
