import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class PriceBandBase(BaseModel):
    label: str
    age_min: int
    age_max: int
    price_pence: int
    qualifier: Optional[str] = None


class PriceBandCreate(PriceBandBase):
    pass


class PriceBandRead(PriceBandBase):
    id: uuid.UUID
    ticket_type_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketTypeBase(BaseModel):
    name: str
    description: str = ""
    inventory_total: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0


class TicketTypeCreate(TicketTypeBase):
    price_bands: List[PriceBandCreate] = []


class TicketTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    inventory_total: Optional[int] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    price_bands: Optional[List[PriceBandCreate]] = None


class TicketTypeRead(TicketTypeBase):
    id: uuid.UUID
    event_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    price_bands: List[PriceBandRead] = []

    model_config = {"from_attributes": True}


class TicketTypeWithAvailability(TicketTypeRead):
    available: Optional[int] = None
