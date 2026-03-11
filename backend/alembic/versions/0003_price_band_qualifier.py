"""add qualifier to price_bands

Revision ID: 0003_price_band_qualifier
Revises: 0002_offline_payments
Create Date: 2026-03-11 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_price_band_qualifier"
down_revision: Union[str, None] = "0002_offline_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("price_bands", sa.Column("qualifier", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("price_bands", "qualifier")
