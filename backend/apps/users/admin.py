"""Admin do usuário SIMA — espelha o ``UserAdmin`` do Django para o User customizado."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ['email']
    list_display = ['email', 'nome', 'role', 'bairro', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff', 'bairro']
    search_fields = ['email', 'nome', 'telefone']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Perfil', {'fields': ('nome', 'telefone', 'bairro', 'lat', 'lng', 'role')}),
        (
            'Permissões',
            {
                'fields': (
                    'is_active',
                    'is_staff',
                    'is_superuser',
                    'groups',
                    'user_permissions',
                )
            },
        ),
        ('Datas', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('email', 'nome', 'password1', 'password2', 'role'),
            },
        ),
    )
    readonly_fields = ['date_joined', 'last_login']
