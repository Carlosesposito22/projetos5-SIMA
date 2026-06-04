from django.conf import settings
from django.db import models


class Relato(models.Model):
    """Relato de alagamento reportado por um usuário."""

    class Nivel(models.TextChoices):
        BAIXO = 'baixo', 'Baixo'
        MEDIO = 'medio', 'Médio'
        ALTO = 'alto', 'Alto'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='relatos',
    )
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    bairro = models.ForeignKey(
        'areas_risco.Bairro',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='relatos',
    )
    nivel = models.CharField(max_length=10, choices=Nivel.choices)
    descricao = models.TextField(max_length=500, blank=True)
    imagem = models.ImageField(upload_to='relatos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'relatos'
        verbose_name = 'Relato'
        verbose_name_plural = 'Relatos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['bairro'], name='relatos_bairro_id_idx'),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'Relato #{self.pk} ({self.get_nivel_display()}) — {self.bairro or "sem bairro"}'
    

class Denuncia(models.Model):
    """Um usuário denuncia um relato como incorreto (alerta falso)."""
    relato = models.ForeignKey(
        Relato,
        on_delete=models.CASCADE,
        related_name='denuncias',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='denuncias',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('relato', 'user')  # impede duplicata
        
class Confirmacao(models.Model):
    """Um usuário confirma que um relato é verdadeiro."""
    relato = models.ForeignKey(
        Relato,
        on_delete=models.CASCADE,
        related_name='confirmacoes',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='confirmacoes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('relato', 'user')
