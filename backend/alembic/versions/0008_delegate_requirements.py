"""add delegate requirements fields

Revision ID: 0008_delegate_requirements
Revises: 0007_venue_fees
Create Date: 2026-03-17

"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_delegate_requirements"
down_revision: Union[str, None] = "0007_venue_fees"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("order_items", sa.Column("dietary_requirements", sa.Text(), nullable=True))
    op.add_column("order_items", sa.Column("access_requirements", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("order_items", "access_requirements")
    op.drop_column("order_items", "dietary_requirements")
