"""Testes do fluxo de autenticação (US10)."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class CadastroTests(APITestCase):
    """POST /api/users/register/"""

    url = None

    def setUp(self):
        self.url = reverse('users:register')

    def test_cadastro_cria_usuario_e_retorna_tokens(self):
        payload = {
            'nome': 'Maria da Silva',
            'email': 'maria@example.com',
            'telefone': '81999990000',
            'bairro': 'Ibura',
            'password': 'senha-forte-123',
            'password_confirm': 'senha-forte-123',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'maria@example.com')
        self.assertEqual(response.data['user']['role'], User.Role.CIDADAO)
        self.assertTrue(User.objects.filter(email='maria@example.com').exists())

    def test_cadastro_rejeita_senhas_diferentes(self):
        payload = {
            'nome': 'X',
            'email': 'x@example.com',
            'password': 'senha-forte-123',
            'password_confirm': 'outra-coisa',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_cadastro_rejeita_email_duplicado(self):
        User.objects.create_user(
            email='dup@example.com', password='senha-forte-123', nome='Dup'
        )
        payload = {
            'nome': 'Outro',
            'email': 'dup@example.com',
            'password': 'senha-forte-123',
            'password_confirm': 'senha-forte-123',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cadastro_rejeita_senha_fraca(self):
        payload = {
            'nome': 'X',
            'email': 'x@example.com',
            'password': '123',
            'password_confirm': '123',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cadastro_ignora_role_recebido_no_payload(self):
        """Mesmo se o cliente tentar mandar role=admin, vem como cidadao."""
        payload = {
            'nome': 'Tentativa',
            'email': 'priv@example.com',
            'role': 'admin',
            'password': 'senha-forte-123',
            'password_confirm': 'senha-forte-123',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='priv@example.com')
        self.assertEqual(user.role, User.Role.CIDADAO)


class LoginTests(APITestCase):
    """POST /api/users/login/"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='ana@example.com',
            password='senha-forte-123',
            nome='Ana',
        )
        self.url = reverse('users:login')

    def test_login_retorna_tokens_e_usuario(self):
        response = self.client.post(
            self.url,
            {'email': 'ana@example.com', 'password': 'senha-forte-123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'ana@example.com')

    def test_login_falha_com_senha_errada(self):
        response = self.client.post(
            self.url,
            {'email': 'ana@example.com', 'password': 'errada'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_falha_com_email_inexistente(self):
        response = self.client.post(
            self.url,
            {'email': 'fantasma@example.com', 'password': 'qualquer'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeTests(APITestCase):
    """GET/PATCH /api/users/me/"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='ana@example.com',
            password='senha-forte-123',
            nome='Ana',
            bairro='Boa Viagem',
        )
        self.url = reverse('users:me')

    def test_me_exige_autenticacao(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_retorna_usuario_autenticado(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'ana@example.com')
        self.assertEqual(response.data['bairro'], 'Boa Viagem')

    def test_me_atualiza_dados_basicos(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url, {'bairro': 'Ibura', 'telefone': '81988887777'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bairro, 'Ibura')
        self.assertEqual(self.user.telefone, '81988887777')

    def test_me_nao_permite_trocar_role(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url, {'role': User.Role.ADMIN}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.CIDADAO)


class LogoutTests(APITestCase):
    """POST /api/users/logout/ — blacklist do refresh token."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='ana@example.com', password='senha-forte-123', nome='Ana'
        )

    def _obter_refresh(self):
        response = self.client.post(
            reverse('users:login'),
            {'email': 'ana@example.com', 'password': 'senha-forte-123'},
            format='json',
        )
        return response.data['refresh']

    def test_logout_invalida_refresh_token(self):
        refresh = self._obter_refresh()
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse('users:logout'), {'refresh': refresh}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

        # Tentar usar o refresh blacklistado depois deve falhar.
        refresh_response = self.client.post(
            reverse('users:refresh'), {'refresh': refresh}, format='json'
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_exige_autenticacao(self):
        response = self.client.post(
            reverse('users:logout'), {'refresh': 'qualquer'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_rejeita_token_invalido(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse('users:logout'), {'refresh': 'lixo'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
