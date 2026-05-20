"""Admin do app relatos — inspeção rápida durante o desenvolvimento."""

from django.contrib import admin

from .models import Relato


@admin.register(Relato)
class RelatoAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'bairro', 'nivel', 'lat', 'lng', 'created_at']
    list_filter = ['nivel', 'bairro']
    search_fields = ['bairro', 'descricao', 'user__email', 'user__nome']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
