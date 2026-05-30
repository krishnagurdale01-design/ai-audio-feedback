from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
import auth
from ai_service import generate_quotation_estimate

router = APIRouter()

@router.post("/", response_model=schemas.Quotation)
async def create_quotation(quotation: schemas.QuotationCreate, db: Session = Depends(database.get_db)):
    # 1. Call AI to get estimate
    estimate = await generate_quotation_estimate(quotation)
    
    # 2. Save to DB
    db_quote = models.Quotation(
        **quotation.model_dump(),
        estimated_cost_min=estimate.get("estimated_cost_min"),
        estimated_cost_max=estimate.get("estimated_cost_max"),
        estimated_timeline=estimate.get("estimated_timeline"),
        cost_breakdown=estimate.get("cost_breakdown"),
        ai_notes=estimate.get("ai_notes")
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

@router.get("/", response_model=List[schemas.Quotation])
def read_quotations(skip: int = 0, limit: int = 100, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    quotations = db.query(models.Quotation).offset(skip).limit(limit).all()
    return quotations

@router.put("/{quote_id}", response_model=schemas.Quotation)
def update_quotation_status(quote_id: int, quote_update: schemas.QuotationUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db_quote = db.query(models.Quotation).filter(models.Quotation.id == quote_id).first()
    if db_quote is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    db_quote.status = quote_update.status
    db.commit()
    db.refresh(db_quote)
    return db_quote
