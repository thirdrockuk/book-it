import uuid
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from datetime import datetime, timezone

from app.database import get_session
from app.models.admin_user import AdminUser
from app.models.event import Event, EventStatus
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.price_band import PriceBand
from app.models.payment import Payment, PaymentStatus
from app.schemas.event import EventCreate, EventUpdate, EventRead, EventReadWithTicketTypes
from app.schemas.order import (
    EventAttendeeReportAgeTab,
    EventAttendeeReport,
    EventAttendeeReportAttendee,
    EventAttendeeReportSettings,
    EventAttendeeReportSettingsUpdate,
    OrderItemPriceUpdate,
    OrderItemRequirementsUpdate,
    OrderRead,
    OrderReadAdmin,
    OrderReadAdminPaginated,
    OrderItemRead,
)
from app.schemas.payment import PaymentCreate, PaymentRead
from app.routers.auth import get_current_admin_user
from app.services.orders import cancel_order
from app.services.pricing import age_at_event

router = APIRouter(prefix="/admin", tags=["admin"])


def _parse_event_attendee_report_age_tabs(raw_tabs) -> List[EventAttendeeReportAgeTab]:
    if not isinstance(raw_tabs, list):
        return []

    parsed_tabs: List[EventAttendeeReportAgeTab] = []
    for raw_tab in raw_tabs:
        if not isinstance(raw_tab, dict):
            continue
        try:
            parsed_tabs.append(EventAttendeeReportAgeTab.model_validate(raw_tab))
        except Exception:
            continue
    return parsed_tabs


def _order_to_admin_read(order: Order) -> OrderReadAdmin:
    amount_paid = sum(
        p.amount_pence for p in order.payments if p.status == PaymentStatus.succeeded
    )
    return OrderReadAdmin(
        id=order.id,
        event_id=order.event_id,
        order_number=order.order_number,
        booker_name=order.booker_name,
        booker_email=order.booker_email,
        booker_phone=order.booker_phone,
        status=order.status,
        total_pence=order.total_pence,
        currency=order.currency,
        created_at=order.created_at,
        confirmed_at=order.confirmed_at,
        expires_at=order.expires_at,
        view_token=order.view_token,
        order_items=[OrderItemRead.from_item(i) for i in order.order_items],
        payments=[PaymentRead.model_validate(p) for p in order.payments],
        amount_paid_pence=amount_paid,
        balance_pence=order.total_pence - amount_paid,
    )


# --- Events ---

@router.get("/events", response_model=List[EventReadWithTicketTypes])
def list_all_events(
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    return session.exec(select(Event)).all()


@router.post("/events", response_model=EventRead)
def create_event(
    data: EventCreate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = Event(**data.model_dump())
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.get("/events/{event_id}", response_model=EventReadWithTicketTypes)
def get_event(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/events/{event_id}", response_model=EventRead)
def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/events/{event_id}")
def delete_event(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(event)
    session.commit()
    return {"ok": True}


# --- Orders ---

@router.get("/events/{event_id}/orders", response_model=List[OrderReadAdmin])
def list_event_orders(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    orders = session.exec(
        select(Order)
        .where(Order.event_id == event_id)
        .order_by(Order.created_at.desc())
    ).all()
    return [_order_to_admin_read(o) for o in orders]


@router.get("/events/{event_id}/attendee-report", response_model=EventAttendeeReport)
def get_event_attendee_report(
    event_id: uuid.UUID,
    include_pending: bool = False,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    included_statuses = [OrderStatus.confirmed]
    if include_pending:
        included_statuses.append(OrderStatus.pending)

    orders = session.exec(
        select(Order).where(Order.event_id == event_id, Order.status.in_(included_statuses))
    ).all()

    event_start_date = event.starts_at.date()
    attendees: List[EventAttendeeReportAttendee] = []
    for order in orders:
        for item in order.order_items:
            attendees.append(
                EventAttendeeReportAttendee(
                    order_id=order.id,
                    order_number=order.order_number,
                    order_status=order.status,
                    booker_name=order.booker_name,
                    booker_email=order.booker_email,
                    attendee_name=item.attendee_name,
                    attendee_dob=item.attendee_dob,
                    attendee_age=age_at_event(item.attendee_dob, event_start_date),
                    ticket_type_id=item.ticket_type_id,
                    ticket_type_name=item.ticket_type.name if item.ticket_type else None,
                    price_band_label=item.price_band.label if item.price_band else None,
                    price_band_qualifier=item.price_band.qualifier if item.price_band else None,
                    price_pence=item.price_pence,
                    venue_fee_pence=item.venue_fee_pence,
                )
            )

    attendees.sort(key=lambda attendee: (attendee.attendee_age, attendee.attendee_name.casefold()))

    return EventAttendeeReport(
        event_id=event.id,
        event_title=event.title,
        event_starts_at=event.starts_at,
        age_tabs=_parse_event_attendee_report_age_tabs(event.attendee_report_age_tabs),
        attendees=attendees,
    )


@router.put("/events/{event_id}/attendee-report/settings", response_model=EventAttendeeReportSettings)
def update_event_attendee_report_settings(
    event_id: uuid.UUID,
    data: EventAttendeeReportSettingsUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.attendee_report_age_tabs = [tab.model_dump() for tab in data.age_tabs]
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)

    return EventAttendeeReportSettings(
        event_id=event.id,
        age_tabs=_parse_event_attendee_report_age_tabs(event.attendee_report_age_tabs),
    )


@router.get("/orders", response_model=List[OrderReadAdmin])
def list_all_orders(
    sort_dir: Literal["desc", "asc"] = "desc",
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order_expression = Order.created_at.desc() if sort_dir == "desc" else Order.created_at.asc()
    tie_breaker_expression = Order.id.desc() if sort_dir == "desc" else Order.id.asc()
    orders = session.exec(select(Order).order_by(order_expression, tie_breaker_expression)).all()
    return [_order_to_admin_read(o) for o in orders]


@router.get("/orders/paginated", response_model=OrderReadAdminPaginated)
def list_all_orders_paginated(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1),
    sort_dir: Literal["desc", "asc"] = "desc",
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    if page_size not in (10, 20, 50):
        raise HTTPException(status_code=422, detail="page_size must be one of 10, 20, or 50")

    total = session.exec(select(func.count(Order.id))).one()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    order_expression = Order.created_at.desc() if sort_dir == "desc" else Order.created_at.asc()
    tie_breaker_expression = Order.id.desc() if sort_dir == "desc" else Order.id.asc()
    offset = (page - 1) * page_size

    orders = session.exec(
        select(Order)
        .order_by(order_expression, tie_breaker_expression)
        .offset(offset)
        .limit(page_size)
    ).all()

    return OrderReadAdminPaginated(
        items=[_order_to_admin_read(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/orders/{order_id}", response_model=OrderReadAdmin)
def get_order(
    order_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_to_admin_read(order)


@router.post("/orders/{order_id}/cancel", response_model=OrderReadAdmin)
def admin_cancel_order(
    order_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    try:
        order = cancel_order(session, order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _order_to_admin_read(order)


@router.put("/orders/{order_id}/items/{item_id}/price", response_model=OrderReadAdmin)
def admin_update_order_item_price(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: OrderItemPriceUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in (OrderStatus.pending, OrderStatus.confirmed):
        raise HTTPException(
            status_code=400,
            detail="Can only update attendee prices for pending or confirmed orders",
        )

    item = session.exec(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    item.price_pence = data.price_pence
    session.add(item)
    session.flush()

    recalculated_total = session.exec(
        select(func.coalesce(func.sum(OrderItem.price_pence), 0)).where(OrderItem.order_id == order_id)
    ).one()
    order.total_pence = int(recalculated_total)
    session.add(order)
    session.commit()
    session.refresh(order)

    return _order_to_admin_read(order)


@router.post("/orders/{order_id}/items/{item_id}/price/reset", response_model=OrderReadAdmin)
def admin_reset_order_item_price(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in (OrderStatus.pending, OrderStatus.confirmed):
        raise HTTPException(
            status_code=400,
            detail="Can only update attendee prices for pending or confirmed orders",
        )

    item = session.exec(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    price_band = item.price_band or session.get(PriceBand, item.price_band_id)
    if not price_band:
        raise HTTPException(status_code=400, detail="Cannot resolve standard price for this attendee")

    if price_band.price_pence < item.venue_fee_pence:
        raise HTTPException(
            status_code=400,
            detail="Standard price is now lower than the venue fee; set a manual price instead",
        )

    item.price_pence = price_band.price_pence
    session.add(item)
    session.flush()

    recalculated_total = session.exec(
        select(func.coalesce(func.sum(OrderItem.price_pence), 0)).where(OrderItem.order_id == order_id)
    ).one()
    order.total_pence = int(recalculated_total)
    session.add(order)
    session.commit()
    session.refresh(order)

    return _order_to_admin_read(order)


@router.put("/orders/{order_id}/items/{item_id}/requirements", response_model=OrderReadAdmin)
def admin_update_order_item_requirements(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: OrderItemRequirementsUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    item = session.exec(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    item.dietary_requirements = data.dietary_requirements
    item.access_requirements = data.access_requirements
    session.add(item)
    session.commit()
    session.refresh(order)

    return _order_to_admin_read(order)


# --- Payments ---

@router.post("/orders/{order_id}/payments", response_model=OrderReadAdmin, status_code=201)
def record_payment(
    order_id: uuid.UUID,
    data: PaymentCreate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot record payment for a cancelled order")

    payment = Payment(
        order_id=order_id,
        provider=data.method,
        provider_txn_id=data.reference,
        note=data.note,
        amount_pence=data.amount_pence,
        currency=order.currency,
        status=PaymentStatus.succeeded,
        received_at=data.received_at,
    )
    session.add(payment)
    session.commit()
    session.refresh(order)
    return _order_to_admin_read(order)


@router.delete("/orders/{order_id}/payments/{payment_id}", status_code=204)
def delete_payment(
    order_id: uuid.UUID,
    payment_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    payment = session.exec(
        select(Payment).where(Payment.id == payment_id, Payment.order_id == order_id)
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.provider == "stub":
        raise HTTPException(status_code=400, detail="Cannot delete system-generated payments")
    session.delete(payment)
    session.commit()


# --- Dashboard ---

@router.get("/dashboard")
def get_dashboard(
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    total_events = session.exec(select(func.count(Event.id))).one()
    total_orders = session.exec(select(func.count(Order.id))).one()
    confirmed_orders = session.exec(
        select(func.count(Order.id)).where(Order.status == OrderStatus.confirmed)
    ).one()
    total_revenue = session.exec(
        select(func.coalesce(func.sum(Order.total_pence), 0)).where(
            Order.status == OrderStatus.confirmed
        )
    ).one()

    return {
        "total_events": total_events,
        "total_orders": total_orders,
        "confirmed_orders": confirmed_orders,
        "total_revenue_pence": total_revenue,
    }
