"""Database connection pool statistics tracking."""

from datetime import datetime, UTC
from typing import Dict, Any


class PoolStats:
    """Track database connection pool statistics."""

    def __init__(self):
        """Initialize pool statistics."""
        self.checkedout = 0
        self.overflow = 0
        self.checkedin = 0
        self.detached = 0
        self.timeouts = 0
        self.total_checkouts = 0
        self.total_checkins = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert stats to dictionary with timestamp."""
        return {
            "checkedout": self.checkedout,
            "overflow": self.overflow,
            "checkedin": self.checkedin,
            "detached": self.detached,
            "timeouts": self.timeouts,
            "total_checkouts": self.total_checkouts,
            "total_checkins": self.total_checkins,
            "timestamp": datetime.now(UTC).isoformat()
        }

    def reset(self) -> None:
        """Reset all statistics to zero."""
        self.checkedout = 0
        self.overflow = 0
        self.checkedin = 0
        self.detached = 0
        self.timeouts = 0
        self.total_checkouts = 0
        self.total_checkins = 0
