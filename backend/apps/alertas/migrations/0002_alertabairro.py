import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alertas', '0001_initial'),
        ('areas_risco', '0002_seed_bairros'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AlertaBairro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nivel', models.CharField(
                    choices=[('atencao', 'Atenção'), ('alerta', 'Alerta'), ('critico', 'Crítico')],
                    max_length=20,
                )),
                ('status', models.CharField(
                    choices=[('ativo', 'Ativo'), ('resolvido', 'Resolvido')],
                    default='ativo',
                    max_length=20,
                )),
                ('total_relatos', models.PositiveIntegerField(
                    default=0,
                    help_text='Relatos na janela que dispararam o gatilho.',
                )),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('resolvido_em', models.DateTimeField(blank=True, null=True)),
                ('bairro', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='alertas_bairro',
                    to='areas_risco.bairro',
                )),
                ('resolvido_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='alertas_bairro_resolvidos',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Alerta de Bairro',
                'verbose_name_plural': 'Alertas de Bairro',
                'db_table': 'alertas_bairro',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.AddIndex(
            model_name='alertabairro',
            index=models.Index(
                fields=['bairro', 'status'],
                name='alertas_ba_bairro_status_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='alertabairro',
            index=models.Index(
                fields=['criado_em'],
                name='alertas_ba_criado_em_idx',
            ),
        ),
    ]
