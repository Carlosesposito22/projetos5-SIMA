from rest_framework import serializers

from .models import Relato


class RelatoAutorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class RelatoSerializer(serializers.ModelSerializer):
    user = RelatoAutorSerializer(read_only=True)

    class Meta:
        model = Relato
        fields = ['id', 'user', 'lat', 'lng', 'bairro', 'nivel', 'descricao', 'created_at']
        read_only_fields = fields


class RelatoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Relato
        fields = ['lat', 'lng', 'bairro', 'nivel', 'descricao']

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

    def validate_bairro(self, value):
        return value.strip()
