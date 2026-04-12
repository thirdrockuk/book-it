"""add venue fee fields

Revision ID: 0007_venue_fees
Revises: 0006_age_tabs
Create Date: 2026-03-17

"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_venue_fees"
down_revision: Union[str, None] = "0006_age_tabs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "price_bands",
        sa.Column("venue_fee_pence", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "order_items",
        sa.Column("venue_fee_pence", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )


def downgrade() -> None:
    op.drop_column("order_items", "venue_fee_pence")
    op.drop_column("price_bands", "venue_fee_pence")
