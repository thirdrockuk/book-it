import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.event import EventStatus
from app.schemas.ticket_type import TicketTypeRead


class EventBase(BaseModel):
    title: str
    description: str = ""
    location: str = ""
    starts_at: datetime
    ends_at: datetime
    status: EventStatus = EventStatus.draft
    sales_start_at: Optional[datetime] = None
    sales_end_at: Optional[datetime] = None
    banner_image_url: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    status: Optional[EventStatus] = None
    sales_start_at: Optional[datetime] = None
    sales_end_at: Optional[datetime] = None
    banner_image_url: Optional[str] = None


class EventRead(EventBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventReadWithTicketTypes(EventRead):
    ticket_types: List[TicketTypeRead] = []
