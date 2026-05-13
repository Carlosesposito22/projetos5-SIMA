"""Serializers do app users — cadastro, perfil e login com payload enriquecido."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Representação do usuário pra retorno (sem dados sensíveis)."""

    class Meta:
        model = User
        fields = [
            'id',
            'nome',
            'email',
            'telefone',
            'bairro',
            'lat',
            'lng',
            'role',
            'date_joined',
        ]
        read_only_fields = ['id', 'role', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """Cadastro público — força role=cidadao."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = [
            'nome',
            'email',
            'telefone',
            'bairro',
            'lat',
            'lng',
            'password',
            'password_confirm',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError(
                {'password_confirm': 'As senhas não conferem.'}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """Login JWT que devolve os tokens + dados do usuário autenticado.

    Evita uma segunda chamada do frontend logo após o login só pra hidratar o perfil.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['nome'] = user.nome
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
