#!/bin/sh
set -e

echo "=== SIMA Analytics — startup ==="
echo "DATABASE_URL: ${DATABASE_URL:-não definida}"

echo "--- Verificando/populando dados históricos ---"
python scripts/gerar_dados_historicos.py

echo "--- Iniciando Streamlit na porta ${PORT:-8501} ---"
exec streamlit run streamlit_app/app.py \
  --server.port="${PORT:-8501}" \
  --server.address=0.0.0.0 \
  --server.headless=true
