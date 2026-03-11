"""add banner_image_url to events

Revision ID: 0005_event_banner_image
Revises: 0004_order_view_token
Create Date: 2026-03-11

"""
from typing import Union
import sqlalchemy as sa
from alembic import op

revision: str = "0005_event_banner_image"
down_revision: Union[str, None] = "0004_order_view_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("banner_image_url", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("events", "banner_image_url")
