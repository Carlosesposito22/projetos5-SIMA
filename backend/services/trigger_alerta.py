"""Orquestrador: avalia risco em uma área e dispara alerta se crítico.

Fluxo: ml_predict.prever_risco -> threshold -> whatsapp_cloud.enviar_alerta
para todos os usuários cadastrados naquela área.
"""

# from . import ml_predict, whatsapp_cloud


def avaliar_e_disparar(area_id: int) -> int:
    """Avalia risco da área. Retorna nº de alertas disparados.

    A ser implementado quando ml_predict e whatsapp_cloud estiverem prontos.
    """
    raise NotImplementedError('Pendente: depende de ml_predict e whatsapp_cloud')
