from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Text, JSON
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, index=True)
    company_name = Column(String, nullable=True)
    email = Column(String, index=True)
    phone_number = Column(String, nullable=True)
    
    project_type = Column(String)
    video_length = Column(String)
    vfx_complexity = Column(String)
    dubbing_languages = Column(JSON) # Store list of languages
    deadline = Column(String)
    additional_services = Column(JSON) # Store list of services
    project_description = Column(Text, nullable=True)
    
    # AI Results
    estimated_cost_min = Column(Integer, nullable=True)
    estimated_cost_max = Column(Integer, nullable=True)
    estimated_timeline = Column(String, nullable=True)
    cost_breakdown = Column(JSON, nullable=True)
    ai_notes = Column(Text, nullable=True)
    
    status = Column(String, default="New") # New, Under Review, Final Quote Sent, Approved, Rejected
