from rest_framework import serializers

from apps.areas_risco.models import Bairro
from apps.users.serializers import BairroResumoSerializer

from .models import Relato


class RelatoAutorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class RelatoSerializer(serializers.ModelSerializer):
    user = RelatoAutorSerializer(read_only=True)
    bairro = BairroResumoSerializer(read_only=True)

    class Meta:
        model = Relato
        fields = ['id', 'user', 'lat', 'lng', 'bairro', 'nivel', 'descricao', 'imagem', 'created_at']
        read_only_fields = ['id', 'user', 'bairro', 'created_at']


class RelatoCreateSerializer(serializers.ModelSerializer):
    bairro = serializers.PrimaryKeyRelatedField(
        queryset=Bairro.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Relato
        fields = ['lat', 'lng', 'bairro', 'nivel', 'descricao', 'imagem']

    def validate_lat(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError('Latitude deve estar entre -90 e 90.')
        return value

    def validate_lng(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError('Longitude deve estar entre -180 e 180.')
        return value

    def validate_descricao(self, value):
        return value.strip()
