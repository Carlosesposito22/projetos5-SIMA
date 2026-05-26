from datetime import timedelta

from django.utils.dateparse import parse_datetime
from django.utils.timezone import now
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Relato
from .serializers import RelatoCreateSerializer, RelatoSerializer


class EDonoOuReadOnly(permissions.BasePermission):
    """Permite edição/exclusão apenas ao criador do relato."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user


class RelatoListCreateView(generics.ListCreateAPIView):
    """GET /api/relatos/  — lista paginada de relatos (mais recentes primeiro).
    POST /api/relatos/ — cria relato em nome do usuário autenticado.

    Query params suportados no GET:
      - ``bairro``: id (ex: ``12``) ou slug (ex: ``boa-viagem``) do bairro.
      - ``nivel``: ``baixo`` | ``medio`` | ``alto``.
      - ``desde``: ISO 8601 (ex: ``2026-05-20T10:00:00Z``) — apenas relatos
        criados a partir desse instante.
      - ``ultimas_horas``: inteiro — atalho para ``desde`` relativo (ex: ``6``).
      - ``meus``: ``true`` — retorna apenas relatos do usuário autenticado.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RelatoCreateSerializer
        return RelatoSerializer

    def get_queryset(self):
        qs = Relato.objects.select_related('user', 'bairro').all()
        params = self.request.query_params

        if bairro := params.get('bairro'):
            bairro = bairro.strip()
            if bairro.isdigit():
                qs = qs.filter(bairro_id=int(bairro))
            else:
                qs = qs.filter(bairro__slug__iexact=bairro)

        if nivel := params.get('nivel'):
            qs = qs.filter(nivel=nivel)

        if desde := params.get('desde'):
            if dt := parse_datetime(desde):
                qs = qs.filter(created_at__gte=dt)

        if ultimas_horas := params.get('ultimas_horas'):
            try:
                horas = int(ultimas_horas)
                qs = qs.filter(created_at__gte=now() - timedelta(hours=horas))
            except ValueError:
                pass

        if params.get('meus') == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        relato = serializer.save(user=request.user)
        return Response(RelatoSerializer(relato).data, status=status.HTTP_201_CREATED)


class RelatoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET    /api/relatos/<id>/ — detalhe de um relato.
    PATCH  /api/relatos/<id>/ — edita nivel/descricao (somente o dono).
    DELETE /api/relatos/<id>/ — remove o relato (somente o dono).
    """

    queryset = Relato.objects.select_related('user', 'bairro').all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, EDonoOuReadOnly]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return RelatoCreateSerializer
        return RelatoSerializer

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True  # sempre PATCH semântico
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        relato = serializer.save()
        return Response(RelatoSerializer(relato).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
