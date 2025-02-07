"""merge_recording_analyses_and_initial

Revision ID: 3b4103932731
Revises: 5f5a68f23d6e, 946b31f13fa5
Create Date: 2025-01-29 13:05:36.539950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b4103932731'
down_revision: Union[str, None] = ('5f5a68f23d6e', '946b31f13fa5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
