from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    client_name: str
    company_name: Optional[str] = None
    email: EmailStr
    phone_number: Optional[str] = None
    project_type: str
    video_length: str
    vfx_complexity: str
    dubbing_languages: List[str]
    deadline: str
    additional_services: List[str]
    project_description: Optional[str] = None

class QuotationCreate(QuotationBase):
    pass

class Quotation(QuotationBase):
    id: int
    estimated_cost_min: Optional[int]
    estimated_cost_max: Optional[int]
    estimated_timeline: Optional[str]
    cost_breakdown: Optional[Dict[str, int]]
    ai_notes: Optional[str]
    status: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class QuotationUpdate(BaseModel):
    status: str
