import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel


class EventStatus(str, Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    description: str = ""
    location: str = ""
    starts_at: datetime
    ends_at: datetime
    status: EventStatus = EventStatus.draft
    sales_start_at: Optional[datetime] = None
    sales_end_at: Optional[datetime] = None
    banner_image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    ticket_types: List["TicketType"] = Relationship(back_populates="event")
    orders: List["Order"] = Relationship(back_populates="event")
