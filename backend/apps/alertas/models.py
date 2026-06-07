from django.db import models

# Create your models here.
"""
App alertas — US02

Responsável por:
  1. Detectar quando um novo relato merece gerar alertas (signal post_save).
  2. Encontrar usuários que moram no raio de risco do ponto.
  3. Registrar cada disparo em Alerta para evitar spam e para auditoria.
  4. Delegar o envio ao backend de notificação configurado (email por padrão,
     WhatsApp via adaptador plugável — ver services.py).

Modelo de dados:
  - Alerta: 1 linha por (relato, usuário notificado).
"""

from django.conf import settings
from django.db import models


class Alerta(models.Model):
    """Registro de uma notificação enviada a um usuário sobre um relato."""

    class Canal(models.TextChoices):
        EMAIL      = 'email',      'E-mail'
        WHATSAPP   = 'whatsapp',   'WhatsApp'
        PUSH       = 'push',       'Push (app)'

    class Status(models.TextChoices):
        PENDENTE   = 'pendente',   'Pendente'
        ENVIADO    = 'enviado',    'Enviado'
        FALHOU     = 'falhou',     'Falhou'

    relato = models.ForeignKey(
        'relatos.Relato',
        on_delete=models.CASCADE,
        related_name='alertas',
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alertas_recebidos',
    )
    canal   = models.CharField(max_length=20, choices=Canal.choices, default=Canal.EMAIL)
    status  = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    detalhe = models.TextField(blank=True, help_text='Erro ou ID externo do disparo.')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table         = 'alertas'
        verbose_name     = 'Alerta'
        verbose_name_plural = 'Alertas'
        ordering         = ['-created_at']
        # Um usuário recebe no máximo 1 alerta por relato por canal.
        unique_together  = ('relato', 'usuario', 'canal')
        indexes = [
            models.Index(fields=['relato']),
            models.Index(fields=['usuario']),
        ]

    def __str__(self):
        return (
            f'Alerta #{self.pk} — relato {self.relato_id} '
            f'→ {self.usuario_id} [{self.canal}] {self.status}'
        )
