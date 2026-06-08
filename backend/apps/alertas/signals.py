"""
apps/alertas/signals.py — US02
"""

import logging
import threading

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.relatos.models import Relato

logger = logging.getLogger(__name__)


def _despachar(relato_pk: int):
    """Roda em thread separada para não bloquear a resposta HTTP."""
    print(f'[SIGNAL] _despachar iniciado para relato #{relato_pk}', flush=True)
    try:
        from apps.alertas.services import relato_criado
        from apps.relatos.models import Relato as R

        relato = R.objects.select_related('user', 'bairro').get(pk=relato_pk)
        relato_criado(relato)
    except Exception as e:
        print(f'[SIGNAL] ERRO ao despachar relato #{relato_pk}: {e}', flush=True)
        logger.exception('Falha ao despachar alertas para relato #%s', relato_pk)


@receiver(post_save, sender=Relato)
def ao_criar_relato(sender, instance, created, **kwargs):
    print(f'[SIGNAL] ao_criar_relato chamado — created={created} pk={instance.pk}', flush=True)
    if not created:
        return
    t = threading.Thread(target=_despachar, args=(instance.pk,), daemon=True)
    t.start()
