import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timezone

from app.database import get_session
from app.models.admin_user import AdminUser
from app.models.event import Event, EventStatus
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.event import EventCreate, EventUpdate, EventRead, EventReadWithTicketTypes
from app.schemas.order import OrderRead, OrderReadAdmin, OrderItemRead
from app.schemas.payment import PaymentCreate, PaymentRead
from app.routers.auth import get_current_admin_user
from app.services.orders import cancel_order

router = APIRouter(prefix="/admin", tags=["admin"])


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
    orders = session.exec(select(Order).where(Order.event_id == event_id)).all()
    return [_order_to_admin_read(o) for o in orders]


@router.get("/orders", response_model=List[OrderReadAdmin])
def list_all_orders(
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    orders = session.exec(select(Order)).all()
    return [_order_to_admin_read(o) for o in orders]


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
