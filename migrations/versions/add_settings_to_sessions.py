"""Add settings column to sessions table

Revision ID: add_settings_to_sessions
Revises: previous_revision
Create Date: 2025-01-29 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = 'add_settings_to_sessions'
down_revision = None  # Update this with your previous migration
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add settings column with default empty JSON object
    op.add_column('sessions', sa.Column('settings', JSONB, nullable=False, server_default='{}'))

def downgrade() -> None:
    op.drop_column('sessions', 'settings') 