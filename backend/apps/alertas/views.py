"""Views do app alertas — US07."""

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.users.permissions import IsDefesaCivilOrAdmin
from .models import AlertaBairro


class AlertaBairroListView(APIView):
    """GET /api/alertas/bairros/ — gatilhos automáticos ativos por bairro (US07).

    Retorna apenas alertas com status 'ativo', ordenados do mais recente ao
    mais antigo. Acessível somente a operadores da Defesa Civil e admins.
    """

    permission_classes = [IsAuthenticated, IsDefesaCivilOrAdmin]

    def get(self, request):
        alertas = (
            AlertaBairro.objects
            .filter(status=AlertaBairro.Status.ATIVO)
            .select_related('bairro', 'resolvido_por')
            .order_by('-criado_em')
        )

        data = [
            {
                'id':            a.pk,
                'bairro':        {'id': a.bairro.pk, 'nome': a.bairro.nome, 'slug': a.bairro.slug},
                'nivel':         a.nivel,
                'status':        a.status,
                'total_relatos': a.total_relatos,
                'criado_em':     a.criado_em,
            }
            for a in alertas
        ]

        return Response(data)


class AlertaBairroResolverView(APIView):
    """POST /api/alertas/bairros/<id>/resolver/ — marca um alerta como resolvido.

    Idempotente: resolver um alerta já resolvido não retorna erro.
    """

    permission_classes = [IsAuthenticated, IsDefesaCivilOrAdmin]

    def post(self, request, pk):
        try:
            alerta = AlertaBairro.objects.get(pk=pk)
        except AlertaBairro.DoesNotExist:
            return Response({'detail': 'Alerta não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if alerta.status == AlertaBairro.Status.RESOLVIDO:
            return Response({'detail': 'Alerta já estava resolvido.'}, status=status.HTTP_200_OK)

        alerta.status       = AlertaBairro.Status.RESOLVIDO
        alerta.resolvido_em  = timezone.now()
        alerta.resolvido_por = request.user
        alerta.save(update_fields=['status', 'resolvido_em', 'resolvido_por'])

        return Response({'detail': 'Alerta resolvido com sucesso.'}, status=status.HTTP_200_OK)
