from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.timezone import now
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Relato

User = get_user_model()


def _criar_usuario(email='maria@example.com', nome='Maria'):
    return User.objects.create_user(email=email, password='senha-forte-123', nome=nome)


class CriarRelatoTests(APITestCase):
    """POST /api/relatos/"""

    def setUp(self):
        self.url = reverse('relatos:lista')
        self.user = _criar_usuario()
        self.payload = {
            'lat': '-8.063169',
            'lng': '-34.871139',
            'bairro': 'Boa Viagem',
            'nivel': Relato.Nivel.MEDIO,
            'descricao': 'Água passando do meio-fio.',
        }

    def test_anonimo_nao_pode_criar(self):
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Relato.objects.exists())

    def test_autenticado_cria_relato(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nivel'], Relato.Nivel.MEDIO)
        self.assertEqual(response.data['bairro'], 'Boa Viagem')
        self.assertEqual(response.data['user']['id'], self.user.id)
        self.assertEqual(response.data['user']['nome'], self.user.nome)
        self.assertEqual(Relato.objects.count(), 1)

    def test_user_vem_da_request_e_ignora_payload(self):
        """Cliente não consegue criar relato em nome de outro usuário."""
        outro = _criar_usuario(email='outro@example.com', nome='Outro')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url, {**self.payload, 'user': outro.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        relato = Relato.objects.get()
        self.assertEqual(relato.user, self.user)

    def test_nivel_invalido_retorna_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url, {**self.payload, 'nivel': 'tsunami'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nivel', response.data)

    def test_lat_fora_do_range_retorna_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url, {**self.payload, 'lat': '95.0'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('lat', response.data)

    def test_lng_fora_do_range_retorna_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url, {**self.payload, 'lng': '-200.0'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('lng', response.data)

    def test_descricao_eh_opcional(self):
        self.client.force_authenticate(user=self.user)
        payload = {**self.payload}
        payload.pop('descricao')
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ListarRelatosTests(APITestCase):
    """GET /api/relatos/ — leitura pública, com filtros opcionais."""

    def setUp(self):
        self.url = reverse('relatos:lista')
        self.user = _criar_usuario()
        Relato.objects.create(
            user=self.user, lat=-8.06, lng=-34.87,
            bairro='Boa Viagem', nivel=Relato.Nivel.ALTO,
        )
        Relato.objects.create(
            user=self.user, lat=-8.05, lng=-34.90,
            bairro='Ibura', nivel=Relato.Nivel.BAIXO,
        )
        Relato.objects.create(
            user=self.user, lat=-8.04, lng=-34.88,
            bairro='Ibura', nivel=Relato.Nivel.MEDIO,
        )

    def test_listagem_publica(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

    def test_filtro_por_bairro_eh_case_insensitive(self):
        response = self.client.get(self.url, {'bairro': 'ibura'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        for item in response.data['results']:
            self.assertEqual(item['bairro'], 'Ibura')

    def test_filtro_por_nivel(self):
        response = self.client.get(self.url, {'nivel': Relato.Nivel.ALTO})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['nivel'], Relato.Nivel.ALTO)

    def test_filtro_ultimas_horas(self):
        antigo = Relato.objects.create(
            user=self.user, lat=-8.0, lng=-34.0,
            bairro='Velho', nivel=Relato.Nivel.BAIXO,
        )
        Relato.objects.filter(pk=antigo.pk).update(created_at=now() - timedelta(hours=48))

        response = self.client.get(self.url, {'ultimas_horas': '6'})
        self.assertEqual(response.data['count'], 3)
        bairros = {item['bairro'] for item in response.data['results']}
        self.assertNotIn('Velho', bairros)

    def test_ordenacao_mais_recente_primeiro(self):
        response = self.client.get(self.url)
        results = response.data['results']
        timestamps = [item['created_at'] for item in results]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))


class DetalheRelatoTests(APITestCase):
    """GET /api/relatos/<id>/"""

    def setUp(self):
        self.user = _criar_usuario()
        self.relato = Relato.objects.create(
            user=self.user, lat=-8.06, lng=-34.87,
            bairro='Boa Viagem', nivel=Relato.Nivel.ALTO,
            descricao='Rua intransitável.',
        )

    def test_detalhe_publico(self):
        response = self.client.get(
            reverse('relatos:detalhe', kwargs={'pk': self.relato.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.relato.pk)
        self.assertEqual(response.data['descricao'], 'Rua intransitável.')

    def test_detalhe_404_para_id_inexistente(self):
        response = self.client.get(reverse('relatos:detalhe', kwargs={'pk': 99999}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
.
