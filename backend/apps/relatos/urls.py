from django.urls import path

from . import views

app_name = 'relatos'

urlpatterns = [
    path('', views.RelatoListCreateView.as_view(), name='lista'),
    path('<int:pk>/', views.RelatoDetailView.as_view(), name='detalhe'),
]
