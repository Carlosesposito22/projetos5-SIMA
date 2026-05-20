from datetime import timedelta

from django.utils.dateparse import parse_datetime
from django.utils.timezone import now
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Relato
from .serializers import RelatoCreateSerializer, RelatoSerializer


class RelatoListCreateView(generics.ListCreateAPIView):
    """GET /api/relatos/  — lista paginada de relatos (mais recentes primeiro).
    POST /api/relatos/ — cria relato em nome do usuário autenticado.

    Query params suportados no GET:
      - ``bairro``: filtro exato (case-insensitive) pelo nome do bairro.
      - ``nivel``: ``baixo`` | ``medio`` | ``alto``.
      - ``desde``: ISO 8601 (ex: ``2026-05-20T10:00:00Z``) — apenas relatos
        criados a partir desse instante.
      - ``ultimas_horas``: inteiro — atalho para ``desde`` relativo (ex: ``6``).
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RelatoCreateSerializer
        return RelatoSerializer

    def get_queryset(self):
        qs = Relato.objects.select_related('user').all()
        params = self.request.query_params

        if bairro := params.get('bairro'):
            qs = qs.filter(bairro__iexact=bairro.strip())

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

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        relato = serializer.save(user=request.user)
        return Response(RelatoSerializer(relato).data, status=status.HTTP_201_CREATED)


class RelatoDetailView(generics.RetrieveAPIView):
    """GET /api/relatos/<id>/ — detalhe de um relato. Imutável no MVP."""

    queryset = Relato.objects.select_related('user').all()
    serializer_class = RelatoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
