from django.urls import path

from . import views
from .views import RelatoListCreateView, RelatoDetailView, RelatoDenunciaView, RelatoConfirmacaoView

app_name = 'relatos'

urlpatterns = [
    path('', views.RelatoListCreateView.as_view(), name='lista'),
    path('<int:pk>/', views.RelatoDetailView.as_view(), name='detalhe'),
    path('<int:pk>/denunciar/', RelatoDenunciaView.as_view(), name='denunciar'),
    path('<int:pk>/confirmar/', RelatoConfirmacaoView.as_view(), name='confirmar'),  # ← novo
]
