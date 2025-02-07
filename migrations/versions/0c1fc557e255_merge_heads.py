"""merge heads

Revision ID: 0c1fc557e255
Revises: 3b4103932731, add_settings_to_sessions
Create Date: 2025-01-29 13:33:36.556488

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0c1fc557e255'
down_revision: Union[str, None] = ('3b4103932731', 'add_settings_to_sessions')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
