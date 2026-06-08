"""
apps/alertas/services.py — US02

Toda a lógica de negócio de alertas vive aqui.
As views e signals são finas; este módulo é testável isoladamente.

Fluxo principal:
  1. relato_criado(relato) — chamado pelo signal post_save do app relatos.
  2. Calcula quais usuários estão no raio de risco.
  3. Para cada usuário, decide o canal (email padrão; whatsapp se configurado).
  4. Chama o adaptador correto e persiste o Alerta.

Geofencing:
  Usa a fórmula de Haversine (math puro, sem PostGIS) pra calcular distância
  entre o ponto do relato e a coordenada do usuário.
  Fallback: se o usuário não tem lat/lng mas tem bairro, e o relato também
  tem bairro, compara os dois bairros.

Raios padrão (configuráveis em settings.py via SIMA_ALERTAS):
  baixo → 300 m
  medio → 600 m
  alto  → 1200 m

Anti-spam:
  Não envia se o usuário já recebeu um alerta deste relato naquele canal
  (garantido pelo unique_together do model).
"""

import logging
import math
from dataclasses import dataclass

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import Alerta

logger = logging.getLogger(__name__)
User   = get_user_model()

# ── Configuração ───────────────────────────────────────────────────────────
# Valores padrão — podem ser sobrescritos em settings.py via SIMA_ALERTAS = {...}

_DEFAULTS = {
    'RAIO_BAIXO_M': 300,
    'RAIO_MEDIO_M': 600,
    'RAIO_ALTO_M':  1200,
    'EMAIL_FROM':   'alertas@sima.recife.br',
    'WA_ENABLED':   True,
}

def cfg(key):
    return getattr(settings, 'SIMA_ALERTAS', {}).get(key, _DEFAULTS[key])

# ── Haversine ──────────────────────────────────────────────────────────────

def _haversine_m(lat1, lng1, lat2, lng2) -> float:
    """Distância em metros entre dois pontos geográficos (fórmula de Haversine)."""
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lng2 - lng1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ── Selecionar usuários elegíveis ──────────────────────────────────────────

def _raio_para_nivel(nivel: str) -> float:
    return {
        'baixo': cfg('RAIO_BAIXO_M'),
        'medio': cfg('RAIO_MEDIO_M'),
        'alto':  cfg('RAIO_ALTO_M'),
    }.get(nivel, cfg('RAIO_MEDIO_M'))

def _usuarios_no_raio(relato):
    """
    Retorna lista de usuários elegíveis para receber alerta do relato.

    Estratégia em cascata:
    1. Usuários com lat/lng dentro do raio (precisão máxima).
    2. Usuários sem coordenadas mas no mesmo bairro do relato (fallback).
    Exclui o próprio autor do relato.
    """
    raio = _raio_para_nivel(relato.nivel)
    rlat, rlng = float(relato.lat), float(relato.lng)

    grau_lat = raio / 111_000
    grau_lng = raio / (111_000 * math.cos(math.radians(rlat)))

    candidatos_geo = (
        User.objects
        .filter(
            is_active=True,
            lat__isnull=False,
            lng__isnull=False,
            lat__range=(rlat - grau_lat, rlat + grau_lat),
            lng__range=(rlng - grau_lng, rlng + grau_lng),
        )
        .exclude(pk=relato.user_id)
    )

    elegíveis_geo = [
        u for u in candidatos_geo
        if _haversine_m(rlat, rlng, float(u.lat), float(u.lng)) <= raio
    ]

    elegíveis_bairro = []
    if relato.bairro_id:
        elegíveis_bairro = list(
            User.objects
            .filter(
                is_active=True,
                lat__isnull=True,
                bairro_id=relato.bairro_id,
            )
            .exclude(pk=relato.user_id)
        )

    seen = {u.pk for u in elegíveis_geo}
    return elegíveis_geo + [u for u in elegíveis_bairro if u.pk not in seen]

# ── Helpers ────────────────────────────────────────────────────────────────

def _formatar_telefone(telefone: str) -> str:
    """
    Normaliza para E.164 (+5581999434582).
    Remove espaços, traços e parênteses; adiciona +55 se não tiver código de país.
    """
    tel = ''.join(c for c in telefone.strip() if c.isdigit() or c == '+')
    if not tel.startswith('+'):
        tel = '+55' + tel
    return tel

# ── Adaptadores de canal ───────────────────────────────────────────────────

@dataclass
class ResultadoEnvio:
    sucesso: bool
    detalhe: str = ''


def _enviar_email(usuario, relato) -> ResultadoEnvio:
    """Envia email de alerta. Usa template HTML se disponível."""
    nivel_display = {
        'baixo': 'Atenção',
        'medio': 'Alerta',
        'alto':  'Crítico',
    }.get(relato.nivel, relato.nivel.capitalize())

    bairro_nome = relato.bairro.nome if relato.bairro else 'Recife'
    app_url     = getattr(settings, 'SIMA_APP_URL', 'http://localhost:5173')
    assunto     = f'[SIMA] {nivel_display} de alagamento em {bairro_nome}'

    contexto = {
        'usuario':       usuario,
        'relato':        relato,
        'nivel_display': nivel_display,
        'bairro_nome':   bairro_nome,
        'app_url':       app_url,
    }

    try:
        corpo_html = render_to_string('alertas/email_alerta.html', contexto)
    except Exception:
        corpo_html = None

    corpo_txt = (
        f'Olá, {usuario.nome}!\n\n'
        f'Um alagamento nível {nivel_display} foi reportado em {bairro_nome}.\n'
        + (f'Endereço: {relato.endereco}\n' if relato.endereco else '')
        + f'Acesse o mapa para mais detalhes: {app_url}\n\n'
        f'— Equipe SIMA'
    )

    try:
        send_mail(
            subject=assunto,
            message=corpo_txt,
            html_message=corpo_html,
            from_email=cfg('EMAIL_FROM'),
            recipient_list=[usuario.email],
            fail_silently=False,
        )
        return ResultadoEnvio(sucesso=True)
    except Exception as exc:
        return ResultadoEnvio(sucesso=False, detalhe=str(exc))


def _enviar_whatsapp(usuario, relato) -> ResultadoEnvio:
    """
    Envia alerta via WhatsApp usando o telefone cadastrado no banco (User.telefone).
    Formata automaticamente para E.164 antes de enviar.
    """
    if not cfg('WA_ENABLED'):
        return ResultadoEnvio(sucesso=False, detalhe='WhatsApp não configurado.')

    if not usuario.telefone:
        return ResultadoEnvio(sucesso=False, detalhe='Usuário sem telefone cadastrado.')

    from .whatsapp import enviar_mensagem_wa

    telefone = _formatar_telefone(usuario.telefone)

    nivel_display = {'baixo': 'Atenção', 'medio': 'Alerta', 'alto': 'Crítico'}.get(
        relato.nivel, relato.nivel.capitalize()
    )
    bairro_nome = relato.bairro.nome if relato.bairro else 'Recife'
    app_url     = getattr(settings, 'SIMA_APP_URL', 'http://localhost:5173')

    endereco_linha = f'📍 {relato.endereco}\n' if relato.endereco else ''
    texto = (
        f'🌊 *SIMA — {nivel_display} em {bairro_nome}*\n'
        f'Alagamento reportado próximo a você.\n'
        f'{endereco_linha}'
        f'Veja no mapa: {app_url}\n\n'
        f'Responda *PARAR* para cancelar alertas.'
    )

    try:
        resultado_api = enviar_mensagem_wa(
            telefone,
            texto,
            nivel_bairro=f'{nivel_display} em {bairro_nome}',
            nivel=nivel_display,
            bairro=bairro_nome,
            endereco=getattr(relato, 'endereco', ''),
            descricao=relato.descricao or '',
        )
        return ResultadoEnvio(sucesso=True, detalhe=str(resultado_api))
    except Exception as exc:
        return ResultadoEnvio(sucesso=False, detalhe=str(exc))

# ── Ponto de entrada público ───────────────────────────────────────────────

def relato_criado(relato) -> int:
    """
    Dispara alertas para todos os usuários no raio do relato.

    Chamado pelo signal post_save em apps/relatos/signals.py.
    Retorna o número de alertas enviados com sucesso.
    """
    usuarios = _usuarios_no_raio(relato)
    if not usuarios:
        logger.info('Relato #%s — nenhum usuário no raio.', relato.pk)
        return 0

    enviados   = 0
    wa_enabled = cfg('WA_ENABLED')

    for usuario in usuarios:
        canais = [Alerta.Canal.EMAIL]
        if wa_enabled and usuario.telefone:
            canais.append(Alerta.Canal.WHATSAPP)

        for canal in canais:
            alerta, criado = Alerta.objects.get_or_create(
                relato=relato,
                usuario=usuario,
                canal=canal,
                defaults={'status': Alerta.Status.PENDENTE},
            )
            if not criado:
                continue

            if canal == Alerta.Canal.EMAIL:
                resultado = _enviar_email(usuario, relato)
            elif canal == Alerta.Canal.WHATSAPP:
                resultado = _enviar_whatsapp(usuario, relato)
            else:
                continue

            alerta.status  = Alerta.Status.ENVIADO if resultado.sucesso else Alerta.Status.FALHOU
            alerta.detalhe = resultado.detalhe
            alerta.save(update_fields=['status', 'detalhe'])

            if resultado.sucesso:
                enviados += 1
            else:
                logger.warning(
                    'Alerta #%s falhou [%s → user %s]: %s',
                    alerta.pk, canal, usuario.pk, resultado.detalhe,
                )

    logger.info('Relato #%s — %d/%d alertas enviados.', relato.pk, enviados, len(usuarios))
    return enviados
