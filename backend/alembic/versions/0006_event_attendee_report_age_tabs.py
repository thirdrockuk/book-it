"""add attendee report age tabs to events

Revision ID: 0006_age_tabs
Revises: 0005_event_banner_image
Create Date: 2026-03-16

"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_age_tabs"
down_revision: Union[str, None] = "0005_event_banner_image"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "attendee_report_age_tabs",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),
    )


def downgrade() -> None:
    op.drop_column("events", "attendee_report_age_tabs")
