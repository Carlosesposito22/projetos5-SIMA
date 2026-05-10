"""Carrega o modelo de regressão treinado em ml/notebooks e prevê risco.

O modelo é serializado com joblib em ml/models/ e carregado uma única vez
no startup (lazy global) para evitar I/O por requisição.
"""

# from pathlib import Path
# import joblib
# from django.conf import settings


def prever_risco(features: dict) -> float:
    """Recebe features (precipitação, relatos recentes, etc.) e devolve score.

    A ser implementado quando o primeiro modelo estiver treinado.
    """
    raise NotImplementedError('Pendente: treinar primeiro modelo em ml/notebooks/03_regressao.ipynb')
