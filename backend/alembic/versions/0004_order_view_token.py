"""add view_token to orders

Revision ID: 0004_order_view_token
Revises: 0003_price_band_qualifier
Create Date: 2026-03-11 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004_order_view_token"
down_revision: Union[str, None] = "0003_price_band_qualifier"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column as nullable first so existing rows can be populated
    op.add_column("orders", sa.Column("view_token", postgresql.UUID(as_uuid=True), nullable=True))
    # Backfill existing rows with a unique UUID each
    op.execute("UPDATE orders SET view_token = gen_random_uuid() WHERE view_token IS NULL")
    # Now enforce not-null and unique
    op.alter_column("orders", "view_token", nullable=False)
    op.create_unique_constraint("uq_orders_view_token", "orders", ["view_token"])


def downgrade() -> None:
    op.drop_constraint("uq_orders_view_token", "orders", type_="unique")
    op.drop_column("orders", "view_token")
