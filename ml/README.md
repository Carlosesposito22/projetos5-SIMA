# SIMA — Trilha de Análise e Visualização de Dados

Pasta da trilha analítica do 5º CC. Vive separada do `backend/` Django porque
mistura notebooks, dataset bruto, modelos serializados e o dashboard Streamlit.

## Estrutura

- `notebooks/` — Jupyter notebooks
  - `01_eda.ipynb` — exploração, distribuições, correlação chuva × nível
  - `02_preprocessing.ipynb` — limpeza, missing values, normalização
  - `03_regressao.ipynb` — modelo + métricas (MAE, RMSE, R²) + `joblib.dump`
  - `04_classificador.ipynb` — risco binário, matriz confusão, ROC
- `data/` — CSVs (gitignored se sensível; ver `.gitignore` da raiz)
- `models/` — `.joblib` do modelo treinado (consumido por `backend/services/ml_predict.py`)
- `streamlit_app/app.py` — dashboard analítico

## Rodar

```bash
# do diretório raiz do repo, com o venv ativo
streamlit run ml/streamlit_app/app.py
jupyter lab ml/notebooks/
```

Dependências em `requirements-ml.txt` (instaladas no mesmo venv do backend).
