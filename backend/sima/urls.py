"""URLs do projeto SIMA. Rotas de API agrupadas por app sob /api/."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/relatos/', include('apps.relatos.urls')),
    path('api/alertas/', include('apps.alertas.urls')),
    path('api/areas-risco/', include('apps.areas_risco.urls')),
    path('api/clima/', include('apps.clima.urls')),
]
