from django.apps import AppConfig


class RelatosConfig(AppConfig):
    name = 'apps.relatos'

    def ready(self):
        # Importar signals aqui garante que o receiver é registrado
        import apps.alertas.signals  # noqa: F401
