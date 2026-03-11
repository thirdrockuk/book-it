import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from app.models.order import OrderStatus
from app.schemas.payment import PaymentRead


class AttendeeInput(BaseModel):
    ticket_type_id: uuid.UUID
    attendee_name: str
    attendee_dob: date
    is_student: bool = False


class OrderCreate(BaseModel):
    event_id: uuid.UUID
    booker_name: str
    booker_email: str
    booker_phone: Optional[str] = None
    attendees: List[AttendeeInput]


class OrderItemRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    ticket_type_id: uuid.UUID
    price_band_id: uuid.UUID
    price_band_label: Optional[str] = None
    price_band_qualifier: Optional[str] = None
    attendee_name: str
    attendee_dob: date
    price_pence: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_item(cls, item) -> "OrderItemRead":
        return cls(
            id=item.id,
            order_id=item.order_id,
            ticket_type_id=item.ticket_type_id,
            price_band_id=item.price_band_id,
            price_band_label=item.price_band.label if item.price_band else None,
            price_band_qualifier=item.price_band.qualifier if item.price_band else None,
            attendee_name=item.attendee_name,
            attendee_dob=item.attendee_dob,
            price_pence=item.price_pence,
            created_at=item.created_at,
        )


class OrderRead(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    order_number: str
    booker_name: str
    booker_email: str
    booker_phone: Optional[str] = None
    status: OrderStatus
    total_pence: int
    currency: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    expires_at: datetime
    view_token: uuid.UUID
    order_items: List[OrderItemRead] = []

    model_config = {"from_attributes": True}


class OrderReadAdmin(OrderRead):
    payments: List[PaymentRead] = []
    amount_paid_pence: int = 0
    balance_pence: int = 0


class BookingViewEvent(BaseModel):
    title: str
    location: str
    starts_at: datetime


class BookingView(BaseModel):
    order_number: str
    booker_name: str
    status: OrderStatus
    total_pence: int
    currency: str
    confirmed_at: Optional[datetime] = None
    event: BookingViewEvent
    order_items: List[OrderItemRead] = []
    payments: List[PaymentRead] = []
    amount_paid_pence: int = 0
    balance_pence: int = 0
