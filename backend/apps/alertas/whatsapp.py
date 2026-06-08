"""
apps/alertas/whatsapp.py — US05

Adaptador de WhatsApp Business.

Suporta dois provedores (configurável em settings.SIMA_WA_PROVIDER):
  - 'twilio'   → Twilio WhatsApp Sandbox / número aprovado
  - 'meta'     → Meta Cloud API (número próprio, produção)

Twilio Sandbox — templates disponíveis (business-initiated):
  O Sandbox do Twilio exige o uso de Content Templates para iniciar
  conversas. O template usado é o "appointment_reminder" pré-aprovado:

    "Your appointment is coming up on {{1}} at {{2}}."

  Mapeamento para alertas SIMA:
    {{1}} → nível do alerta  (ex: "Crítico em Boa Viagem")
    {{2}} → link do mapa     (ex: "http://localhost:5173")

  Após o usuário responder qualquer mensagem, o sistema pode enviar
  texto livre por 24h (session message).

── Como configurar (settings.py) ──────────────────────────────────────────

Para Twilio:
  SIMA_WA_PROVIDER   = 'twilio'
  TWILIO_ACCOUNT_SID = 'ACxxx'
  TWILIO_AUTH_TOKEN  = 'xxx'
  TWILIO_WA_FROM     = 'whatsapp:+14155238886'
  TWILIO_WA_TEMPLATE_SID = 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'  # opcional

Para Meta:
  SIMA_WA_PROVIDER      = 'meta'
  META_WA_TOKEN         = 'EAAxxxxx'
  META_WA_PHONE_ID      = '1234567890'
  META_WA_VERIFY_TOKEN  = 'seu-token-secreto'
  META_WA_TEMPLATE_NAME = 'alerta_alagamento'

────────────────────────────────────────────────────────────────────────────
"""

import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

logger = logging.getLogger(__name__)

APP_URL = getattr(settings, 'SIMA_APP_URL', 'http://localhost:5173')


# ── Envio proativo (chamado por services.py) ───────────────────────────────

def enviar_mensagem_wa(
    telefone: str,
    texto: str,
    nivel_bairro: str = None,
    nivel: str = None,
    bairro: str = None,
    endereco: str = None,
    descricao: str = None,
) -> dict:
    """
    Envia uma mensagem WhatsApp pelo provedor configurado.

    Parâmetros:
      telefone    — número no formato E.164 (+5581999434582)
      texto       — mensagem completa (usada como fallback / sessão aberta)
      nivel_bairro — string resumida para o {{1}} do template Twilio
                     ex: "Crítico em Boa Viagem"
    """
    provider = getattr(settings, 'SIMA_WA_PROVIDER', None)

    if provider == 'twilio':
        return _enviar_twilio(telefone, texto, nivel_bairro, nivel=nivel, bairro=bairro, endereco=endereco, descricao=descricao)
    elif provider == 'meta':
        return _enviar_meta(telefone, texto)
    else:
        raise RuntimeError(
            'SIMA_WA_PROVIDER não configurado. '
            'Defina "twilio" ou "meta" em settings.py.'
        )


def _enviar_twilio(telefone: str, texto: str, nivel_bairro: str = None, *, nivel: str = None, bairro: str = None, endereco: str = None, descricao: str = None) -> dict:
    """
    Envia via Twilio.

    Estratégia:
      1. Se TWILIO_WA_TEMPLATE_SID estiver configurado → usa Content Template
         (funciona para business-initiated, sem precisar que o usuário responda).
      2. Caso contrário → tenta mensagem livre (só funciona se o usuário
         já iniciou conversa nas últimas 24h).
    """
    try:
        from twilio.rest import Client
    except ImportError:
        raise RuntimeError('Instale o pacote twilio: pip install twilio')

    client       = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    from_number  = settings.TWILIO_WA_FROM
    to_number    = f'whatsapp:{telefone}'
    template_sid = getattr(settings, 'TWILIO_WA_TEMPLATE_SID', None)

    if template_sid:
        # ── Content Template (business-initiated) ─────────────────────────
        # Template "Appointment Reminder":
        #   "Your appointment is coming up on {{1}} at {{2}}."
        # Reutilizamos os slots:
        #   {{1}} → nível + bairro  ex: "Crítico em Boa Viagem"
        #   {{2}} → link do mapa
        msg = client.messages.create(
            from_=from_number,
            to=to_number,
            content_sid=template_sid,
            content_variables=json.dumps({
                'nivel':     nivel or nivel_bairro or 'Alerta',
                'bairro':    bairro or '',
                'endereco':  endereco or '',
                'descrição': descricao or '',
                'url':       APP_URL,
            }),
        )
    else:
        # ── Mensagem livre (session message) ─────────────────────────────
        # Só funciona se o usuário respondeu nas últimas 24h.
        msg = client.messages.create(
            from_=from_number,
            to=to_number,
            body=texto,
        )

    return {'sid': msg.sid, 'status': msg.status}


def _enviar_meta(telefone: str, texto: str) -> dict:
    import urllib.request

    phone_id = settings.META_WA_PHONE_ID
    token    = settings.META_WA_TOKEN
    template = getattr(settings, 'META_WA_TEMPLATE_NAME', None)

    if template:
        payload = {
            'messaging_product': 'whatsapp',
            'to': telefone,
            'type': 'template',
            'template': {
                'name': template,
                'language': {'code': 'pt_BR'},
                'components': [
                    {'type': 'body', 'parameters': [{'type': 'text', 'text': texto}]}
                ],
            },
        }
    else:
        payload = {
            'messaging_product': 'whatsapp',
            'to': telefone,
            'type': 'text',
            'text': {'body': texto},
        }

    data = json.dumps(payload).encode()
    req  = urllib.request.Request(
        f'https://graph.facebook.com/v19.0/{phone_id}/messages',
        data=data,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type':  'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


# ── Webhook (verificação + recebimento de mensagens) ──────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    """
    GET  /api/alertas/whatsapp/webhook/ — verificação Meta
    POST /api/alertas/whatsapp/webhook/ — mensagens recebidas
    """

    def get(self, request):
        mode      = request.GET.get('hub.mode')
        token     = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        verify_token = getattr(settings, 'META_WA_VERIFY_TOKEN', '')

        if mode == 'subscribe' and token == verify_token:
            logger.info('WhatsApp webhook verificado com sucesso.')
            return HttpResponse(challenge, content_type='text/plain')

        logger.warning('Falha na verificação do webhook WhatsApp.')
        return HttpResponse('Forbidden', status=403)

    def post(self, request):
        if not self._assinatura_valida(request):
            return HttpResponse('Unauthorized', status=401)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse('Bad Request', status=400)

        try:
            entry    = body['entry'][0]
            changes  = entry['changes'][0]
            value    = changes['value']
            messages = value.get('messages', [])
        except (KeyError, IndexError):
            return JsonResponse({'status': 'no_messages'})

        for msg in messages:
            self._processar_mensagem(msg, value)

        return JsonResponse({'status': 'ok'})

    # ── Helpers ───────────────────────────────────────────────────────────

    def _assinatura_valida(self, request) -> bool:
        secret = getattr(settings, 'META_WA_APP_SECRET', None)
        if not secret:
            return True  # sem secret configurado, skip em desenvolvimento

        sig_header = request.headers.get('X-Hub-Signature-256', '')
        if not sig_header.startswith('sha256='):
            return False

        expected = hmac.HMAC(
            secret.encode(),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(sig_header[7:], expected)

    def _processar_mensagem(self, msg: dict, value: dict):
        from_number = msg.get('from', '')
        msg_type    = msg.get('type', '')

        if msg_type == 'text':
            texto = msg.get('text', {}).get('body', '').strip().lower()
        else:
            texto = ''

        logger.info('WA mensagem recebida de %s: %r', from_number, texto)

        if texto in ('parar', 'stop', 'cancelar'):
            resposta = (
                '✓ Você não receberá mais alertas via WhatsApp.\n'
                f'Para reativar, acesse {APP_URL}/perfil'
            )
            # TODO: desativar flag de notificação WA no User
        else:
            resposta = (
                '🌊 *SIMA — Recife*\n'
                f'Veja os alagamentos em tempo real:\n{APP_URL}\n\n'
                'Responda *PARAR* para não receber mais alertas.'
            )

        try:
            enviar_mensagem_wa(from_number, resposta)
        except Exception:
            logger.exception('Falha ao responder mensagem WA de %s', from_number)
