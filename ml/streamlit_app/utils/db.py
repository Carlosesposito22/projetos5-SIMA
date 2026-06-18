"""Conexão ao PostgreSQL e carregamento de dados para o dashboard analítico."""
import os
import pandas as pd
import streamlit as st

_DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://sima:sima@localhost:5432/sima')


def _connect():
    import psycopg2
    url = _DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    return psycopg2.connect(url)


def _query(sql: str, parse_dates: list[str] | None = None) -> pd.DataFrame:
    """Executa SQL e retorna DataFrame. Propaga exceções para o chamador tratar."""
    with _connect() as conn:
        return pd.read_sql(sql, conn, parse_dates=parse_dates or [])


@st.cache_data(ttl=300, show_spinner='Carregando relatos...')
def get_relatos() -> pd.DataFrame:
    """Retorna relatos com join de bairros e variáveis derivadas.

    Levanta RuntimeError com mensagem legível se o banco não estiver acessível.
    """
    sql = """
        SELECT r.id,
               r.nivel,
               CAST(r.lat AS FLOAT)  AS lat,
               CAST(r.lng AS FLOAT)  AS lng,
               r.created_at,
               b.nome                AS bairro,
               b.rpa
        FROM   relatos r
        LEFT   JOIN bairros b ON b.id = r.bairro_id
        ORDER  BY r.created_at
    """
    df = _query(sql, parse_dates=['created_at'])
    df['hora']      = df['created_at'].dt.hour
    df['mes']       = df['created_at'].dt.month
    df['data']      = df['created_at'].dt.date
    df['nivel_num'] = df['nivel'].map({'baixo': 1, 'medio': 2, 'alto': 3})
    return df


@st.cache_data(ttl=3600, show_spinner=False)
def get_bairros() -> pd.DataFrame:
    """Retorna lista de bairros cadastrados."""
    return _query("SELECT id, nome, rpa FROM bairros ORDER BY nome")


@st.cache_data(ttl=300, show_spinner=False)
def get_engajamento() -> pd.DataFrame:
    """Retorna relatos com contagens de confirmações e denúncias."""
    sql = """
        SELECT r.id,
               r.nivel,
               r.created_at,
               b.nome                   AS bairro,
               CAST(r.lat AS FLOAT)     AS lat,
               CAST(r.lng AS FLOAT)     AS lng,
               COALESCE(c.n_conf, 0)   AS confirmacoes,
               COALESCE(d.n_den,  0)   AS denuncias
        FROM   relatos r
        LEFT   JOIN bairros b ON b.id = r.bairro_id
        LEFT   JOIN (
            SELECT relato_id, COUNT(*) AS n_conf
            FROM   relatos_confirmacao
            GROUP  BY relato_id
        ) c ON c.relato_id = r.id
        LEFT   JOIN (
            SELECT relato_id, COUNT(*) AS n_den
            FROM   relatos_denuncia
            GROUP  BY relato_id
        ) d ON d.relato_id = r.id
        ORDER  BY r.created_at
    """
    df = _query(sql, parse_dates=['created_at'])
    df['hora']      = df['created_at'].dt.hour
    df['mes']       = df['created_at'].dt.month
    df['nivel_num'] = df['nivel'].map({'baixo': 1, 'medio': 2, 'alto': 3})
    return df
