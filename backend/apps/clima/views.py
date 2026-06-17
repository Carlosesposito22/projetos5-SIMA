"""
Proxy para OpenWeatherMap — dados atuais de Recife.
GET /api/clima/atual/
"""

import requests
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

OWM_URL = "https://api.openweathermap.org/data/2.5/weather"
# Coordenadas do centro de Recife
LAT, LON = -8.0539, -34.8811


class ClimaAtualView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        key = settings.OPENWEATHER_API_KEY
        if not key:
            return Response({"erro": "OPENWEATHER_API_KEY não configurada."}, status=503)

        try:
            r = requests.get(
                OWM_URL,
                params={"lat": LAT, "lon": LON, "appid": key, "units": "metric", "lang": "pt_br"},
                timeout=5,
            )
            r.raise_for_status()
            d = r.json()
        except Exception as e:
            return Response({"erro": str(e)}, status=502)

        chuva = d.get("rain", {})
        vento = d.get("wind", {})
        main  = d.get("main", {})

        return Response({
            "chuva_1h":   chuva.get("1h", 0),
            "chuva_3h":   chuva.get("3h", 0),
            "temp":       main.get("temp"),
            "sensacao":   main.get("feels_like"),
            "humidade":   main.get("humidity"),
            "vento_kmh":  round(vento.get("speed", 0) * 3.6, 1),
            "descricao":  d.get("weather", [{}])[0].get("description", ""),
            "atualizado": d.get("dt"),
        })
