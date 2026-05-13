"""
Modelo de usuário do SIMA.

Autenticação por email. Três perfis: cidadão (default), Defesa Civil, admin.
Campos extras (telefone, bairro, lat, lng) servem aos alertas hiperlocais
via WhatsApp — quem mora dentro do raio de risco recebe a notificação.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Manager customizado — login por email em vez de username."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('Email é obrigatório.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser precisa de is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser precisa de is_superuser=True.')
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Usuário do SIMA — cidadão, agente da Defesa Civil ou administrador."""

    class Role(models.TextChoices):
        CIDADAO = 'cidadao', 'Cidadão'
        DEFESA_CIVIL = 'defesa_civil', 'Defesa Civil'
        ADMIN = 'admin', 'Administrador'

    nome = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    telefone = models.CharField(max_length=20, blank=True)
    bairro = models.CharField(max_length=80, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CIDADAO)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        db_table = 'users'
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.nome} <{self.email}>'
