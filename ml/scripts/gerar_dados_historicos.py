#!/usr/bin/env python3
"""Gera relatos históricos simulados e insere no PostgreSQL do SIMA.

Uso:
    python ml/scripts/gerar_dados_historicos.py

Variáveis de ambiente:
    DATABASE_URL  — padrão: postgresql://sima:sima@localhost:5432/sima
    N_RELATOS     — número de relatos a inserir (padrão: 800)

O script é idempotente: se já houver >= N_RELATOS/2 relatos no banco,
encerra sem inserir nada para não duplicar dados em re-execuções.
"""
import os
import random
import sys
from datetime import datetime, timedelta

import numpy as np
import psycopg2

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://sima:sima@localhost:5432/sima')
N_RELATOS    = int(os.getenv('N_RELATOS', '800'))

# ──────────────────────────────────────────────────────────────────────────────
# Distribuições calibradas nos dados reais (41 relatos)
# ──────────────────────────────────────────────────────────────────────────────
NIVEIS       = ['baixo', 'medio', 'alto']
NIVEL_PESOS  = [0.07, 0.10, 0.83]

# Período chuvoso de Recife: abr–ago (peso 3–4), seco: set–fev (peso 1)
PESOS_MES = {1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 4, 7: 3, 8: 3, 9: 2, 10: 1, 11: 1, 12: 1}

# Recife: lat -8.00 a -8.17 / lng -34.85 a -35.00
LAT_MIN, LAT_MAX = -8.17, -8.00
LNG_MIN, LNG_MAX = -35.00, -34.85

BOT_EMAIL = 'bot@sima.local'
BOT_NOME  = 'SIMA Bot (dados simulados)'


def _connect():
    url = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    return psycopg2.connect(url)


def _peso_hora(h: int) -> float:
    if 16 <= h <= 23:
        return 3.0
    if 12 <= h <= 15 or 0 <= h <= 2:
        return 1.5
    return 0.5


def _data_aleatoria(ano: int = 2024) -> datetime:
    """Gera um datetime aleatório em `ano` com sazonalidade mensal e horária."""
    meses = list(range(1, 13))
    pesos = [PESOS_MES[m] for m in meses]
    mes   = random.choices(meses, weights=pesos)[0]

    # Número de dias do mês
    if mes in (4, 6, 9, 11):
        max_dia = 30
    elif mes == 2:
        max_dia = 29 if ano % 4 == 0 else 28
    else:
        max_dia = 31

    dia   = random.randint(1, max_dia)
    horas = list(range(24))
    hora  = random.choices(horas, weights=[_peso_hora(h) for h in horas])[0]
    minuto = random.randint(0, 59)
    segundo = random.randint(0, 59)
    return datetime(ano, mes, dia, hora, minuto, segundo)


def garantir_bot_user(conn) -> int:
    """Cria o usuário bot se não existir. Retorna o user_id."""
    with conn.cursor() as cur:
        cur.execute('SELECT id FROM users WHERE email = %s', (BOT_EMAIL,))
        row = cur.fetchone()
        if row:
            return row[0]

        cur.execute(
            """
            INSERT INTO users
                (nome, email, password, telefone, bairro_id, lat, lng,
                 role, is_active, is_staff, is_superuser, date_joined)
            VALUES (%s, %s, %s, '', NULL, NULL, NULL,
                    'cidadao', TRUE, FALSE, FALSE, NOW())
            RETURNING id
            """,
            (BOT_NOME, BOT_EMAIL, '!simulated'),
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        print(f'Usuário bot criado: id={user_id}')
        return user_id


def carregar_bairros(conn) -> list[tuple[int, str]]:
    """Retorna lista de (id, nome) de todos os bairros."""
    with conn.cursor() as cur:
        cur.execute('SELECT id, nome FROM bairros ORDER BY id')
        return cur.fetchall()


def contar_relatos(conn) -> int:
    """Retorna o total de relatos no banco."""
    with conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM relatos')
        return cur.fetchone()[0]


def inserir_relatos(conn, user_id: int, bairros: list, n: int) -> None:
    """Insere n relatos simulados no banco."""
    bairro_ids = [b[0] for b in bairros]
    # Distribui bairros com leve peso para os primeiros (simula concentração)
    pesos_bairro = [max(1, 10 - i * 0.1) for i in range(len(bairro_ids))]

    registros = []
    for _ in range(n):
        nivel    = random.choices(NIVEIS, weights=NIVEL_PESOS)[0]
        bairro_id = random.choices(bairro_ids, weights=pesos_bairro)[0]
        lat      = round(random.uniform(LAT_MIN, LAT_MAX), 6)
        lng      = round(random.uniform(LNG_MIN, LNG_MAX), 6)
        criado   = _data_aleatoria()
        registros.append((user_id, lat, lng, bairro_id, nivel, '', '', criado))

    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO relatos
                (user_id, lat, lng, bairro_id, nivel, endereco, descricao, imagem, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, %s)
            """,
            registros,
        )
    conn.commit()
    print(f'{n} relatos simulados inseridos.')


def main() -> None:
    print(f'Conectando ao banco: {DATABASE_URL}')
    try:
        conn = _connect()
    except Exception as e:
        print(f'Erro de conexão: {e}', file=sys.stderr)
        sys.exit(1)

    total_atual = contar_relatos(conn)
    print(f'Relatos no banco atualmente: {total_atual}')

    if total_atual >= N_RELATOS // 2:
        print(
            f'Banco já tem {total_atual} relatos (≥ {N_RELATOS // 2}). '
            'Nada a fazer. Para forçar, ajuste N_RELATOS.'
        )
        conn.close()
        return

    bairros = carregar_bairros(conn)
    if not bairros:
        print('Nenhum bairro encontrado. Execute as migrations primeiro.', file=sys.stderr)
        conn.close()
        sys.exit(1)

    print(f'{len(bairros)} bairros encontrados.')
    user_id = garantir_bot_user(conn)
    inserir_relatos(conn, user_id, bairros, N_RELATOS)
    conn.close()
    print('Concluído.')


if __name__ == '__main__':
    main()
