"""
App alertas — US02 + US07

Modelos:
  - Alerta: 1 linha por (relato, usuário notificado) — US02/US05.
  - AlertaBairro: gatilho automático por threshold de bairro — US07.
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


class AlertaBairro(models.Model):
    """
    Gatilho automático de nível crítico por bairro — US07.

    Criado automaticamente por services.verificar_threshold_bairro() quando
    o número de relatos em um bairro cruza o threshold configurado em
    SIMA_ALERTAS. O operador da Defesa Civil vê esses alertas no painel e
    pode marcá-los como resolvidos.
    """

    class Nivel(models.TextChoices):
        ATENCAO = 'atencao', 'Atenção'
        ALERTA  = 'alerta',  'Alerta'
        CRITICO = 'critico', 'Crítico'

    class Status(models.TextChoices):
        ATIVO     = 'ativo',     'Ativo'
        RESOLVIDO = 'resolvido', 'Resolvido'

    bairro        = models.ForeignKey(
        'areas_risco.Bairro',
        on_delete=models.CASCADE,
        related_name='alertas_bairro',
    )
    nivel         = models.CharField(max_length=20, choices=Nivel.choices)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.ATIVO)
    total_relatos = models.PositiveIntegerField(
        default=0,
        help_text='Relatos na janela que dispararam o gatilho.',
    )
    criado_em     = models.DateTimeField(auto_now_add=True)
    resolvido_em  = models.DateTimeField(null=True, blank=True)
    resolvido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='alertas_bairro_resolvidos',
    )

    class Meta:
        db_table            = 'alertas_bairro'
        verbose_name        = 'Alerta de Bairro'
        verbose_name_plural = 'Alertas de Bairro'
        ordering            = ['-criado_em']
        indexes = [
            models.Index(fields=['bairro', 'status'], name='alertas_ba_bairro_status_idx'),
            models.Index(fields=['criado_em'],         name='alertas_ba_criado_em_idx'),
        ]

    def __str__(self):
        return f'AlertaBairro #{self.pk} — {self.bairro} [{self.nivel}] {self.status}'
