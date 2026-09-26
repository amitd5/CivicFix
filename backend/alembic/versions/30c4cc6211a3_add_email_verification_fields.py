"""add email verification fields

Revision ID: 30c4cc6211a3
Revises: 0f8388415035
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "30c4cc6211a3"
down_revision: Union[str, Sequence[str], None] = "0f8388415035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # -----------------------------------------------------
    # ADD EMAIL VERIFICATION COLUMNS
    # -----------------------------------------------------

    op.add_column(
        "users",
        sa.Column(
            "is_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "verification_otp",
            sa.String(length=6),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "otp_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # -----------------------------------------------------
    # REMOVE SERVER DEFAULT
    #
    # Existing users become False.
    # New users will get the model default.
    # -----------------------------------------------------

    op.alter_column(
        "users",
        "is_verified",
        server_default=None,
    )


def downgrade() -> None:

    op.drop_column(
        "users",
        "otp_expires_at",
    )

    op.drop_column(
        "users",
        "verification_otp",
    )

    op.drop_column(
        "users",
        "is_verified",
    )