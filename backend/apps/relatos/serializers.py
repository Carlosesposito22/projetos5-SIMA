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
    total_denuncias = serializers.IntegerField(source='denuncias.count', read_only=True)
    ja_denunciou = serializers.SerializerMethodField()
    total_confirmacoes = serializers.IntegerField(source='confirmacoes.count', read_only=True)  # ← novo
    ja_confirmou = serializers.SerializerMethodField()  # ← novo

    def get_ja_denunciou(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.denuncias.filter(user=request.user).exists()

    def get_ja_confirmou(self, obj):  # ← novo
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.confirmacoes.filter(user=request.user).exists()

    class Meta:
        model = Relato
        fields = [
            'id', 'user', 'lat', 'lng', 'bairro',
            'nivel', 'descricao', 'imagem', 'created_at',
            'total_denuncias', 'ja_denunciou',
            'total_confirmacoes', 'ja_confirmou',  # ← novo
        ]
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
    