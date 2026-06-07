"""
apps/alertas/whatsapp.py — US05

Adaptador de WhatsApp Business.

Suporta dois provedores (configurável em settings.SIMA_WA_PROVIDER):
  - 'twilio'   → Twilio WhatsApp Sandbox / número aprovado
  - 'meta'     → Meta Cloud API (número próprio, produção)

Webhook de entrada (GET /api/alertas/whatsapp/webhook/):
  Verificação do desafio Meta (mode=subscribe).

Webhook de entrada (POST /api/alertas/whatsapp/webhook/):
  Processa mensagens recebidas dos usuários.
  Por ora apenas responde com o link do mapa (MVP).
  Expandir aqui para: opt-in, opt-out, consulta de alertas.

Envio proativo:
  Chamado por services._enviar_whatsapp() quando um relato é criado.
  
── Como configurar (settings.py) ──────────────────────────────────────────

Para Twilio:
  SIMA_WA_PROVIDER = 'twilio'
  TWILIO_ACCOUNT_SID = 'ACxxx'
  TWILIO_AUTH_TOKEN  = 'xxx'
  TWILIO_WA_FROM     = 'whatsapp:+14155238886'

Para Meta:
  SIMA_WA_PROVIDER      = 'meta'
  META_WA_TOKEN         = 'EAAxxxxx'          # token permanente da página
  META_WA_PHONE_ID      = '1234567890'        # Phone number ID
  META_WA_VERIFY_TOKEN  = 'seu-token-secreto' # qualquer string, definida por você
  META_WA_TEMPLATE_NAME = 'alerta_alagamento' # template aprovado pela Meta

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

APP_URL = getattr(settings, 'SIMA_APP_URL', 'https://sima.recife.br')


# ── Envio proativo (chamado por services.py) ───────────────────────────────

def enviar_mensagem_wa(telefone: str, texto: str) -> dict:
    """
    Envia uma mensagem WhatsApp pelo provedor configurado.
    Retorna o payload de resposta da API.
    """
    provider = getattr(settings, 'SIMA_WA_PROVIDER', None)

    if provider == 'twilio':
        return _enviar_twilio(telefone, texto)
    elif provider == 'meta':
        return _enviar_meta(telefone, texto)
    else:
        raise RuntimeError(
            'SIMA_WA_PROVIDER não configurado. '
            'Defina "twilio" ou "meta" em settings.py.'
        )


def _enviar_twilio(telefone: str, texto: str) -> dict:
    try:
        from twilio.rest import Client
    except ImportError:
        raise RuntimeError('Instale o pacote twilio: pip install twilio')

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    msg = client.messages.create(
        from_=settings.TWILIO_WA_FROM,
        to=f'whatsapp:{telefone}',
        body=texto,
    )
    return {'sid': msg.sid, 'status': msg.status}


def _enviar_meta(telefone: str, texto: str) -> dict:
    import urllib.request

    phone_id = settings.META_WA_PHONE_ID
    token    = settings.META_WA_TOKEN

    # Usa template aprovado se disponível; caso contrário mensagem livre
    # (mensagens livres só funcionam dentro de 24h de uma conversa iniciada
    # pelo usuário — templates funcionam a qualquer hora)
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

    # ── GET: desafio de verificação Meta ──────────────────────────────────
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

    # ── POST: processar mensagem recebida ─────────────────────────────────
    def post(self, request):
        # Verificar assinatura HMAC (Meta envia X-Hub-Signature-256)
        if not self._assinatura_valida(request):
            return HttpResponse('Unauthorized', status=401)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse('Bad Request', status=400)

        # Extrair mensagens (estrutura padrão Meta Cloud API)
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
            return True   # sem secret configurado, skip em desenvolvimento

        sig_header = request.headers.get('X-Hub-Signature-256', '')
        if not sig_header.startswith('sha256='):
            return False

        expected = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(sig_header[7:], expected)

    def _processar_mensagem(self, msg: dict, value: dict):
        """
        Processa uma mensagem recebida de um usuário via WhatsApp.

        MVP: qualquer mensagem recebe o link do mapa.
        Próximos passos:
          - "PARAR" → desativa alertas do usuário (opt-out)
          - "OK"    → confirma o relato mais recente do bairro
          - Integrar com sistema de opt-in (cadastro pelo WA)
        """
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
