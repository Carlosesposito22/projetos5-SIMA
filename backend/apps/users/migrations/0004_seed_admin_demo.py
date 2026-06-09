"""
Seed de conveniência: cria uma conta de Admin pra dev/demo.

Idempotente — se a conta já existe, não faz nada.

As credenciais ficam visíveis na tela de login (aba Admin) — o
componente Login.jsx no frontend assume EXATAMENTE estes valores.
Se mudar aqui, mudar lá também.
"""

from django.contrib.auth.hashers import make_password
from django.db import migrations

EMAIL_DEMO = 'admin@sima.local'
SENHA_DEMO = 'admin123'
NOME_DEMO  = 'Administrador (demo)'


def criar_conta_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    if User.objects.filter(email=EMAIL_DEMO).exists():
        return
    User.objects.create(
        nome=NOME_DEMO,
        email=EMAIL_DEMO,
        password=make_password(SENHA_DEMO),
        role='admin',
        is_active=True,
        is_staff=True,
        is_superuser=False,
    )


def remover_conta_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(email=EMAIL_DEMO).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_seed_defesa_civil_demo'),
    ]

    operations = [
        migrations.RunPython(
            criar_conta_admin,
            remover_conta_admin,
        ),
    ]
