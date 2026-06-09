from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    __table_args__ = {"schema": "identity"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clerk_id: Mapped[str | None] = mapped_column(String(128), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(128), nullable=False)
    prenom: Mapped[str] = mapped_column(String(128), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    est_actif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    activation_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deactivation_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_access: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def is_admin(self) -> bool:
        return self.role == "administrateur"
