"""
apps/relatos/signals.py — US02

Dispara alertas assincronamente sempre que um Relato é criado.

Por que signal em vez de sobrescrever save()?
  - Mantém o model limpo (sem dependência circular em apps/alertas).
  - Facilita testes: basta usar disconnect() no setUp do teste.

Por que thread separada?
  - O POST /api/relatos/ devolve 201 imediatamente para o app.
  - O envio de email pode demorar (SMTP externo).
  - No MVP não há Celery; threading.Thread é suficiente.
  - Em produção, substitua o bloco `_despachar` por uma task Celery:
      from apps.alertas.tasks import despachar_alertas
      despachar_alertas.delay(relato.pk)
"""

import logging
import threading

from django.db.models.signals import post_save
from django.dispatch import receiver

from ..relatos.models import Relato

logger = logging.getLogger(__name__)


def _despachar(relato_pk: int):
    """Roda em thread separada para não bloquear a resposta HTTP."""
    try:
        # Import tardio evita ciclo relatos → alertas → relatos
        from apps.alertas.services import relato_criado
        from apps.relatos.models import Relato as R

        relato = R.objects.select_related('user', 'bairro').get(pk=relato_pk)
        relato_criado(relato)
    except Exception:
        logger.exception('Falha ao despachar alertas para relato #%s', relato_pk)


@receiver(post_save, sender=Relato)
def ao_criar_relato(sender, instance, created, **kwargs):
    """Só dispara na criação — edições não geram novos alertas."""
    if not created:
        return
    t = threading.Thread(target=_despachar, args=(instance.pk,), daemon=True)
    t.start()
