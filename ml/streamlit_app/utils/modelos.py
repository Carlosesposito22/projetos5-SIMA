"""Funções auxiliares para treinamento dos modelos de ML."""
import numpy as np
import pandas as pd
import scipy.stats as stats
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import LabelEncoder, label_binarize
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.metrics import (
    confusion_matrix, accuracy_score, f1_score,
    precision_score, recall_score,
    roc_curve, auc, precision_recall_curve,
    r2_score, mean_squared_error,
)

MAP_COR = {'baixo': '#10b981', 'medio': '#f59e0b', 'alto': '#ef4444'}


def loocv_classificadores(df: pd.DataFrame) -> dict | None:
    """Treina Árvore de Decisão e Regressão Logística com LOOCV.

    Retorna None quando há menos de 5 amostras válidas.
    """
    df = df.dropna(subset=['nivel', 'hora', 'bairro']).copy()
    if len(df) < 5:
        return None

    le_bairro = LabelEncoder()
    le_nivel  = LabelEncoder()
    df['bairro_enc'] = le_bairro.fit_transform(df['bairro'].astype(str))
    df['nivel_enc']  = le_nivel.fit_transform(df['nivel'])

    X = df[['hora', 'bairro_enc']].values
    y = df['nivel_enc'].values

    dt  = DecisionTreeClassifier(max_depth=3, random_state=42)
    lr  = LogisticRegression(max_iter=500, random_state=42)
    loo = LeaveOneOut()

    y_pred_dt   = cross_val_predict(dt, X, y, cv=loo)
    y_pred_lr   = cross_val_predict(lr, X, y, cv=loo)
    y_score_dt  = cross_val_predict(dt, X, y, cv=loo, method='predict_proba')
    y_score_lr  = cross_val_predict(lr, X, y, cv=loo, method='predict_proba')

    dt.fit(X, y)

    return {
        'le_nivel':   le_nivel,
        'le_bairro':  le_bairro,
        'X': X, 'y': y,
        'features':   ['hora', 'bairro'],
        'y_pred_dt':  y_pred_dt,
        'y_pred_lr':  y_pred_lr,
        'y_score_dt': y_score_dt,
        'y_score_lr': y_score_lr,
        'dt_full':    dt,
        'n': len(df),
    }


def regressao_simples(df: pd.DataFrame, feature: str) -> dict | None:
    """Regressão linear simples: `feature` → nivel_num."""
    df = df.dropna(subset=['nivel_num', feature]).copy()
    if len(df) < 5:
        return None

    X = df[[feature]].values
    y = df['nivel_num'].values

    reg    = LinearRegression().fit(X, y)
    y_pred = reg.predict(X)
    r, p   = stats.pearsonr(df[feature], df['nivel_num'])

    return {
        'reg':      reg,
        'X': X, 'y': y,
        'y_pred':   y_pred,
        'residuos': y - y_pred,
        'r2':       r2_score(y, y_pred),
        'rmse':     mean_squared_error(y, y_pred) ** 0.5,
        'r': r, 'p': p,
        'coef':     reg.coef_[0],
        'feature':  feature,
    }


def metricas_classificacao(y_true, y_pred) -> dict:
    """Dicionário de métricas para um conjunto de predições."""
    return {
        'Acurácia':          accuracy_score(y_true, y_pred),
        'Precisão (macro)':  precision_score(y_true, y_pred, average='macro', zero_division=0),
        'Recall (macro)':    recall_score(y_true, y_pred, average='macro', zero_division=0),
        'F1 (macro)':        f1_score(y_true, y_pred, average='macro', zero_division=0),
        'F1 (weighted)':     f1_score(y_true, y_pred, average='weighted', zero_division=0),
    }
