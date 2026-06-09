from django.contrib import admin

from .models import Alerta, AlertaBairro


@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display  = ('id', 'relato', 'usuario', 'canal', 'status', 'created_at')
    list_filter   = ('canal', 'status')
    raw_id_fields = ('relato', 'usuario')
    ordering      = ('-created_at',)


@admin.register(AlertaBairro)
class AlertaBairroAdmin(admin.ModelAdmin):
    list_display  = ('id', 'bairro', 'nivel', 'status', 'total_relatos', 'criado_em', 'resolvido_por')
    list_filter   = ('nivel', 'status')
    raw_id_fields = ('resolvido_por',)
    ordering      = ('-criado_em',)
    readonly_fields = ('criado_em', 'resolvido_em')
