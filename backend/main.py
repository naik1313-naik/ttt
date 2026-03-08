from datetime import datetime, date
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from database import Base, engine, get_db, SessionLocal
from models import User, Transaction, Budget, Category, TxnType
from schemas import (
    UserCreate,
    UserOut,
    LoginRequest,
    TokenResponse,
    TransactionCreate,
    TransactionOut,
    BudgetCreate,
    BudgetOut,
    CategoryOut,
    AnalyticsResponse,
)
from auth import get_password_hash, verify_password, create_access_token, get_current_user, require_admin


app = FastAPI(title="SmartSpend API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        has_cat = db.query(Category).first()
        if not has_cat:
            names = [
                "Food & Dining",
                "Transportation",
                "Housing",
                "Bills & Utilities",
                "Shopping",
                "Entertainment",
                "Health & Medical",
                "Education",
                "Savings & Investments",
                "Miscellaneous",
            ]
            for n in names:
                db.add(Category(category_name=n))
            db.commit()
    finally:
        db.close()


# --- WebSocket manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


ws_manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keepalive/no-op
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# --- Auth ---
@app.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role=payload.role.lower() if payload.role else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)


# --- Categories ---
@app.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.category_name.asc()).all()
    return cats


# --- Transactions ---
@app.get("/transactions", response_model=List[TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    category: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    q: Optional[str] = None,
):
    query = db.query(Transaction).filter(Transaction.user_id == user.id)
    if category:
        query = query.filter(Transaction.category == category)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if q:
        query = query.filter(func.lower(Transaction.notes).like(f"%{q.lower()}%"))
    return query.order_by(Transaction.date.desc()).all()


@app.post("/transactions", response_model=TransactionOut)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate category
    if not db.query(Category).filter(Category.id == payload.category).first():
        raise HTTPException(status_code=404, detail="Category not found")

    txn = Transaction(
        user_id=user.id,
        amount=payload.amount,
        category=payload.category,
        type=TxnType(payload.type),
        date=payload.date,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    # Notify clients
    try:
        import anyio

        anyio.from_thread.run(ws_manager.broadcast, {"event": "transaction_created", "id": txn.id})
    except Exception:
        pass
    return txn


@app.delete("/transactions/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    txn = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == user.id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    try:
        import anyio

        anyio.from_thread.run(ws_manager.broadcast, {"event": "transaction_deleted", "id": txn_id})
    except Exception:
        pass
    return


# --- Budgets ---
@app.post("/budgets", response_model=BudgetOut)
def set_budget(
    payload: BudgetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    # Validate category
    if not db.query(Category).filter(Category.id == payload.category).first():
        raise HTTPException(status_code=404, detail="Category not found")
    # Upsert-like logic
    budget = (
        db.query(Budget)
        .filter(Budget.user_id == user.id, Budget.category == payload.category, Budget.month == payload.month)
        .first()
    )
    if budget:
        budget.budget_amount = payload.budget_amount
    else:
        budget = Budget(
            user_id=user.id,
            category=payload.category,
            budget_amount=payload.budget_amount,
            month=payload.month,
        )
        db.add(budget)
    db.commit()
    db.refresh(budget)
    try:
        import anyio

        anyio.from_thread.run(
            ws_manager.broadcast,
            {"event": "budget_updated", "category": payload.category, "month": payload.month},
        )
    except Exception:
        pass
    return budget


@app.get("/budgets", response_model=List[BudgetOut])
def get_budgets(
    month: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    query = db.query(Budget).filter(Budget.user_id == user.id)
    if month:
        query = query.filter(Budget.month == month)
    return query.all()


# --- Analytics ---
@app.get("/analytics", response_model=AnalyticsResponse)
def analytics(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.utcnow().date()
    target_year = year or today.year
    target_month = month or today.month

    monthly_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TxnType.income,
            extract("year", Transaction.date) == target_year,
            extract("month", Transaction.date) == target_month,
        )
        .scalar()
    )
    monthly_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TxnType.expense,
            extract("year", Transaction.date) == target_year,
            extract("month", Transaction.date) == target_month,
        )
        .scalar()
    )
    total_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(Transaction.user_id == user.id, Transaction.type == TxnType.income)
        .scalar()
    )
    total_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(Transaction.user_id == user.id, Transaction.type == TxnType.expense)
        .scalar()
    )
    total_balance = total_income - total_expenses

    # by category (current month)
    cat_rows = (
        db.query(Transaction.category, func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TxnType.expense,
            extract("year", Transaction.date) == target_year,
            extract("month", Transaction.date) == target_month,
        )
        .group_by(Transaction.category)
        .all()
    )
    by_category = [{"category": int(cat_id), "amount": float(total)} for cat_id, total in cat_rows]

    # monthly series (last 6 months)
    series = []
    for m in range(1, 13):
        m_income = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
            .filter(
                Transaction.user_id == user.id,
                Transaction.type == TxnType.income,
                extract("year", Transaction.date) == target_year,
                extract("month", Transaction.date) == m,
            )
            .scalar()
        )
        m_exp = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
            .filter(
                Transaction.user_id == user.id,
                Transaction.type == TxnType.expense,
                extract("year", Transaction.date) == target_year,
                extract("month", Transaction.date) == m,
            )
            .scalar()
        )
        series.append({"month": m, "income": float(m_income), "expense": float(m_exp)})

    return AnalyticsResponse(
        total_balance=float(total_balance),
        monthly_income=float(monthly_income),
        monthly_expenses=float(monthly_expenses),
        savings=float(monthly_income - monthly_expenses),
        by_category=by_category,
        monthly_series=series,
    )


# --- Admin endpoints ---
@app.get("/admin/users", response_model=List[UserOut])
def admin_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@app.get("/admin/transactions", response_model=List[TransactionOut])
def admin_transactions(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Transaction).order_by(Transaction.created_at.desc()).all()


@app.delete("/admin/transactions/{txn_id}", status_code=204)
def admin_delete_transaction(txn_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}
