# Book-it

A full-stack event booking system built with **FastAPI** (backend) and **React + Vite** (frontend), modelled after Ticket Tailor. Events have ticket types with age-banded pricing — attendee prices are resolved automatically from date of birth.

---

## Features

- **Events** with ticket types and age-banded price bands
- **Student qualifier**: price bands can be marked as student-rate; attendees self-declare student status at checkout
- **Inventory management** per ticket type (pending orders hold inventory for 15 minutes)
- **Multi-step checkout**: attendees → booker details → review & pay
- **Automatic price resolution** from attendee date of birth at event start date
- **Admin panel** with JWT authentication: manage events, ticket types, orders, admin users
- **Offline payment recording**: log cash, bank transfer, cheque, or other payments against an order; paid/outstanding totals updated in real time
- **Secure booking view links**: each order has a unique token URL that bookers can use to view their booking, payments, and balance without logging in
- **Email confirmations** via [Resend](https://resend.com) (optional, includes booking view link)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLModel, Alembic, PostgreSQL |
| Frontend | React 18, Vite, TailwindCSS, TanStack Query |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Email | Resend |
| Infrastructure | Docker Compose |

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker and Docker Compose installed

### 1. Clone and configure

```bash
git clone https://github.com/thirdrockuk/book-it.git
cd book-it
```

Copy the backend env file:
```bash
cp backend/.env.example backend/.env
```

Optionally edit `backend/.env` to set `SECRET_KEY` and `RESEND_API_KEY`.

### 2. Start all services

```bash
docker-compose up --build
```

This will:
- Start PostgreSQL on port 5432
- Run Alembic migrations automatically
- Start FastAPI on port 8000
- Start the Vite dev server on port 5173

### 3. Create the first admin user

```bash
docker-compose exec backend python -m app.scripts.seed_admin \
    --email admin@example.com \
    --password changeme123
```

Then log in at [http://localhost:5173/admin/login](http://localhost:5173/admin/login).

### 4. Open the app

| URL | Description |
|---|---|
| http://localhost:5173 | Public event booking site |
| http://localhost:5173/admin | Admin panel |
| http://localhost:8000/docs | FastAPI interactive API docs |

---

## Running Without Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set DATABASE_URL to your local PostgreSQL instance

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://bookit:bookit@localhost:5432/bookit` | PostgreSQL connection string |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key — **change in production!** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | JWT token TTL (8 hours) |
| `RESEND_API_KEY` | *(empty)* | Resend API key — email is skipped if not set |
| `EMAIL_FROM_ADDRESS` | `bookit@yourdomain.com` | From address for emails |
| `EMAIL_FROM_NAME` | `Bookit` | From name for emails |
| `APP_NAME` | `Bookit` | Application name |
| `APP_URL` | `http://localhost:5173` | Frontend URL (used in emails/CORS) |
| `ENVIRONMENT` | `development` | Set to `production` to disable SQL echo |

---

## Creating an Admin User (CLI)

If you need to create an admin user without Docker:

```bash
cd backend
python -m app.scripts.seed_admin \
    --email admin@example.com \
    --password your-secure-password
```

The command is idempotent: if the admin already exists, it updates the password and ensures the user is active.

---

## API Reference

### Public Endpoints

```
GET  /api/events                     List published events
GET  /api/events/{id}                Event detail with ticket types and price bands
POST /api/orders                     Create a pending order
GET  /api/orders/{id}                Get order details
POST /api/orders/{id}/confirm        Confirm order
POST /api/orders/{id}/cancel         Cancel order
GET  /api/orders/view/{token}        Booker-facing view (no auth — uses secure view token)
```

### Auth

```
POST /api/auth/login                 Returns JWT access token
GET  /api/auth/me                    Current admin user info
```

### Admin (JWT required)

```
GET    /api/admin/dashboard                              Stats summary
GET    /api/admin/events                                 All events (all statuses)
POST   /api/admin/events                                 Create event
GET    /api/admin/events/{id}                            Get event
PUT    /api/admin/events/{id}                            Update event
DELETE /api/admin/events/{id}                            Delete event
GET    /api/admin/events/{id}/ticket-types               List ticket types
POST   /api/admin/events/{id}/ticket-types               Create ticket type
PUT    /api/admin/events/{id}/ticket-types/{tid}         Update ticket type
DELETE /api/admin/events/{id}/ticket-types/{tid}         Delete ticket type
GET    /api/admin/events/{id}/orders                     Orders for an event
GET    /api/admin/orders                                 All orders (includes paid/balance totals)
GET    /api/admin/orders/{id}                            Order detail
POST   /api/admin/orders/{id}/cancel                     Cancel order
GET    /api/admin/orders/{id}/payments                   Payments on an order
POST   /api/admin/orders/{id}/payments                   Record a payment
DELETE /api/admin/orders/{id}/payments/{pid}             Remove a payment
GET    /api/admin/users                                  List admin users
POST   /api/admin/users                                  Create admin user
GET    /api/admin/users/{id}                             Get admin user
PUT    /api/admin/users/{id}                             Update admin user
DELETE /api/admin/users/{id}                             Delete admin user
```

Full interactive docs available at `/docs` when the backend is running.

---

## Business Logic

### Age calculation
Attendee age is calculated at the **event start date** (not today), so a child who turns 18 the week after the event still receives child pricing:

```python
def age_at_event(dob: date, event_start: date) -> int:
    age = event_start.year - dob.year
    if (event_start.month, event_start.day) < (dob.month, dob.day):
        age -= 1
    return age
```

### Inventory
```
available = inventory_total - count(OrderItems where order.status IN ('pending', 'confirmed') AND order.expires_at > now())
```

Pending orders hold inventory for 15 minutes. On confirmation, `expires_at` is extended by one year.

### Order numbers
Human-readable format: `BK-{YEAR}-{SEQUENCE}` e.g. `BK-2026-00142`

### Payment
Payments are recorded manually by admin staff against a confirmed order. Any number of payments can be added until the balance is zero. Supported methods: `cash`, `bank_transfer`, `cheque`, `other`. The paid total and outstanding balance are calculated on the fly from the sum of succeeded payments.

To integrate Stripe or another gateway, add a payment provider in `backend/app/services/orders.py` and record the resulting payment via the existing `Payment` model.

### Secure booking view links
Each order is assigned a UUID `view_token` at creation time. The URL `{APP_URL}/booking/{view_token}` is a public, read-only page showing event details, attendees, payments, and outstanding balance — no login required. The link is included in the confirmation email and can be copied from the admin order detail page.

---

## Project Structure

```
bookit/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app entry point
│   │   ├── config.py            Pydantic settings (env vars)
│   │   ├── database.py          SQLModel engine + session
│   │   ├── models/              SQLModel table models
│   │   ├── routers/             API route handlers
│   │   ├── schemas/             Pydantic request/response schemas
│   │   └── services/            Business logic
│   │       ├── pricing.py       DOB to age to price band resolution
│   │       ├── inventory.py     Availability checks
│   │       ├── orders.py        Order create/confirm/cancel
│   │       └── email.py         Resend integration
│   ├── alembic/                 Database migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              Routes
│   │   ├── api/                 Axios client + TanStack Query hooks
│   │   ├── components/          Shared UI components
│   │   ├── pages/               Route pages (public + admin)
│   │   ├── hooks/               useAuth, usePriceBand
│   │   ├── utils/               age.ts, currency.ts
│   │   └── types/               TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```
