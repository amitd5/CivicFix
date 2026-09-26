"""add complaint responses

Revision ID: aff46901b504
Revises: 63a4a01c1842
Create Date: 2026-09-21 18:48:40.230349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "aff46901b504"
down_revision: Union[str, Sequence[str], None] = "63a4a01c1842"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "complaint_responses",

        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),

        sa.Column(
            "complaint_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "responded_by",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["complaint_id"],
            ["complaints.id"],
        ),

        sa.ForeignKeyConstraint(
            ["responded_by"],
            ["users.id"],
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_complaint_responses_id"),
        "complaint_responses",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_complaint_responses_id"),
        table_name="complaint_responses",
    )

    op.drop_table("complaint_responses")
