# Migration to add imagem field to Relato model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('relatos', '0002_alter_relato_bairro'),
    ]

    operations = [
        migrations.AddField(
            model_name='relato',
            name='imagem',
            field=models.ImageField(blank=True, null=True, upload_to='relatos/'),
        ),
    ]
