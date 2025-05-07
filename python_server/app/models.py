from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, constr

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "new_docent"  # new_docent, seasoned_docent, coordinator

class UserCreate(UserBase):
    password: constr(min_length=6)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

class UserInDB(UserBase):
    id: int
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDB):
    pass

class TagRequestBase(BaseModel):
    date: datetime
    time_slot: str  # AM or PM
    new_docent_id: int

class TagRequestCreate(TagRequestBase):
    pass

class TagRequestUpdate(BaseModel):
    status: Optional[str] = None  # requested, filled, cancelled
    seasoned_docent_id: Optional[int] = None

class TagRequestInDB(TagRequestBase):
    id: int
    status: str = "requested"
    seasoned_docent_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TagRequest(TagRequestInDB):
    pass

# Authentication models
class LoginData(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    password: constr(min_length=6)

# CSV upload model
class CSVUser(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str  # new_docent, seasoned_docent, coordinator 