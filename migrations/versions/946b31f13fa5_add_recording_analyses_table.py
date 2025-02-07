"""add_recording_analyses_table

Revision ID: 946b31f13fa5
Revises: previous_revision
Create Date: 2025-01-29 12:57:49.061000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '946b31f13fa5'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create recording_analyses table
    op.create_table(
        'recording_analyses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recording_id', sa.Integer(), nullable=False),
        sa.Column('transcription', sa.Text(), nullable=True),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('timing_score', sa.Float(), nullable=True),
        sa.Column('pronunciation_score', sa.Float(), nullable=True),
        sa.Column('emotion_score', sa.Float(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('suggestions', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['recording_id'], ['recordings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_recording_analyses_id'),
        'recording_analyses',
        ['id'],
        unique=False
    )
    
    # Remove transcription column from recordings table
    op.drop_column('recordings', 'transcription')

def downgrade() -> None:
    # Add back transcription column to recordings table
    op.add_column(
        'recordings',
        sa.Column('transcription', postgresql.JSON(), nullable=True)
    )
    
    # Drop recording_analyses table
    op.drop_index(op.f('ix_recording_analyses_id'), table_name='recording_analyses')
    op.drop_table('recording_analyses')
