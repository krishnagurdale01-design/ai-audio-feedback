from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, quotations
import models

# Create all tables in the engine (for development)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Quotation Estimator API",
    description="Backend for the AI Quotation Estimator application.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development. In production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(quotations.router, prefix="/api/quotations", tags=["quotations"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Create an admin user if it doesn't exist
from database import SessionLocal
import auth as auth_service

db = SessionLocal()
try:
    admin_email = "admin@example.com"
    existing_admin = auth_service.get_user(db, email=admin_email)
    if not existing_admin:
        new_admin = models.User(
            email=admin_email,
            hashed_password=auth_service.get_password_hash("admin123")
        )
        db.add(new_admin)
        db.commit()
finally:
    db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
