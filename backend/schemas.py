from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: str = "user"


class UserOut(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TransactionCreate(BaseModel):
    amount: float
    category: int
    type: str
    date: date
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    user_id: int
    amount: float
    category: int
    type: str
    date: date
    payment_method: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    category: int
    budget_amount: float
    month: str  # YYYY-MM


class BudgetOut(BaseModel):
    id: int
    user_id: int
    category: int
    budget_amount: float
    month: str

    class Config:
        from_attributes = True


class CategoryOut(BaseModel):
    id: int
    category_name: str

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    savings: float
    by_category: List[dict]
    monthly_series: List[dict]

