from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
import google.generativeai as genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Environment variables
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = 'HS256'

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReceiptItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    price: float

class Receipt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vendor: str
    items: List[ReceiptItem]
    date: str
    total: float
    gst: Optional[float] = None
    category: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FinanceGoal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    goal: str
    target_amount: Optional[float] = None
    deadline: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class GoalRequest(BaseModel):
    goal: str
    target_amount: Optional[float] = None
    deadline: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return verify_token(credentials.credentials)

# ============ GEMINI HELPERS ============

async def extract_receipt_data(image_base64: str) -> Dict[str, Any]:
    """Extract receipt data using Gemini Vision"""
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        prompt = """Analyze this receipt image and extract the following information in JSON format:
{
  "vendor": "store name",
  "items": [{"name": "item name", "quantity": number, "price": number}],
  "date": "YYYY-MM-DD format",
  "total": total_amount,
  "gst": gst_amount,
  "category": "one of: Food & Dining, Groceries, Shopping, Transportation, Entertainment, Healthcare, Utilities, Other"
}

Be precise and extract all visible items. If any field is not visible, use null or best estimate."""
        
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_base64}])
        response_text = response.text
        
        # Parse JSON from response
        import json
        import re
        
        # Try to extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data
        else:
            raise ValueError("Could not parse JSON from response")
            
    except Exception as e:
        logger.error(f"Error extracting receipt data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract receipt data: {str(e)}")

async def get_chat_response(user_id: str, message: str) -> str:
    """Get chatbot response with RAG context"""
    try:
        # Get user's receipts for context
        receipts = await db.receipts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
        
        # Get user's goals
        goals = await db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(10)
        
        # Calculate spending summary
        total_spent = sum(r.get('total', 0) for r in receipts)
        categories = {}
        for r in receipts:
            cat = r.get('category', 'Other')
            categories[cat] = categories.get(cat, 0) + r.get('total', 0)
        
        # Build context
        context = f"""User's Financial Context:
- Total spent in recent receipts: ${total_spent:.2f}
- Number of receipts: {len(receipts)}
- Spending by category: {', '.join([f"{k}: ${v:.2f}" for k, v in categories.items()])}
- Active goals: {len(goals)}

Recent receipts:
"""
        for r in receipts[:5]:
            context += f"- {r.get('vendor', 'Unknown')}: ${r.get('total', 0):.2f} on {r.get('date', 'N/A')} ({r.get('category', 'Other')})\n"
        
        if goals:
            context += "\nFinancial Goals:\n"
            for g in goals:
                context += f"- {g.get('goal', 'No description')}"
                if g.get('target_amount'):
                    context += f" (Target: ${g.get('target_amount')})"
                context += "\n"
        
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel(
            'gemini-3-flash-preview',
            system_instruction=f"You are a helpful personal finance advisor. You help users understand their spending patterns, achieve their financial goals, and make better money decisions.\n\n{context}\n\nProvide personalized, actionable advice based on the user's actual spending data. Be encouraging but realistic."
        )
        
        response = model.generate_content(message)
        
        return response.text
        
    except Exception as e:
        logger.error(f"Error getting chat response: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat response: {str(e)}")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name
    )
    
    user_doc = user.model_dump()
    user_doc['password_hash'] = hash_password(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user.id)
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(
        id=user_doc['id'],
        email=user_doc['email'],
        name=user_doc['name'],
        created_at=datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    )
    
    token = create_token(user.id)
    return {"token": token, "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ============ RECEIPT ROUTES ============

@api_router.post("/receipts/upload")
async def upload_receipt(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    try:
        # Read and encode image
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        # Extract data using Gemini
        receipt_data = await extract_receipt_data(image_base64)
        
        # Create receipt
        receipt = Receipt(
            user_id=user_id,
            vendor=receipt_data.get('vendor', 'Unknown'),
            items=[ReceiptItem(**item) for item in receipt_data.get('items', [])],
            date=receipt_data.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d')),
            total=receipt_data.get('total', 0),
            gst=receipt_data.get('gst'),
            category=receipt_data.get('category', 'Other'),
            image_url=f"data:image/jpeg;base64,{image_base64}"
        )
        
        # Save to database
        receipt_doc = receipt.model_dump()
        receipt_doc['created_at'] = receipt_doc['created_at'].isoformat()
        receipt_doc['items'] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in receipt_doc['items']]
        
        await db.receipts.insert_one(receipt_doc)
        
        return receipt
        
    except Exception as e:
        logger.error(f"Error uploading receipt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {str(e)}")

@api_router.get("/receipts", response_model=List[Receipt])
async def get_receipts(user_id: str = Depends(get_current_user)):
    receipts = await db.receipts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for receipt in receipts:
        if isinstance(receipt.get('created_at'), str):
            receipt['created_at'] = datetime.fromisoformat(receipt['created_at'])
    
    return receipts

@api_router.get("/receipts/{receipt_id}", response_model=Receipt)
async def get_receipt(receipt_id: str, user_id: str = Depends(get_current_user)):
    receipt = await db.receipts.find_one({"id": receipt_id, "user_id": user_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if isinstance(receipt.get('created_at'), str):
        receipt['created_at'] = datetime.fromisoformat(receipt['created_at'])
    
    return Receipt(**receipt)

@api_router.delete("/receipts/{receipt_id}")
async def delete_receipt(receipt_id: str, user_id: str = Depends(get_current_user)):
    result = await db.receipts.delete_one({"id": receipt_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"message": "Receipt deleted successfully"}

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/summary")
async def get_analytics_summary(user_id: str = Depends(get_current_user)):
    receipts = await db.receipts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    total_spent = sum(r.get('total', 0) for r in receipts)
    
    # Category breakdown
    categories = {}
    for r in receipts:
        cat = r.get('category', 'Other')
        categories[cat] = categories.get(cat, 0) + r.get('total', 0)
    
    # Monthly spending
    monthly = {}
    for r in receipts:
        date_str = r.get('date', '')
        if date_str:
            try:
                month = date_str[:7]  # YYYY-MM
                monthly[month] = monthly.get(month, 0) + r.get('total', 0)
            except:
                pass
    
    return {
        "total_spent": total_spent,
        "total_receipts": len(receipts),
        "categories": categories,
        "monthly": dict(sorted(monthly.items())),
        "average_transaction": total_spent / len(receipts) if receipts else 0
    }

# ============ CHAT ROUTES ============

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    # Save user message
    user_msg = ChatMessage(
        user_id=user_id,
        role="user",
        content=request.message
    )
    user_msg_doc = user_msg.model_dump()
    user_msg_doc['created_at'] = user_msg_doc['created_at'].isoformat()
    await db.chat_messages.insert_one(user_msg_doc)
    
    # Get AI response
    response_text = await get_chat_response(user_id, request.message)
    
    # Save assistant message
    assistant_msg = ChatMessage(
        user_id=user_id,
        role="assistant",
        content=response_text
    )
    assistant_msg_doc = assistant_msg.model_dump()
    assistant_msg_doc['created_at'] = assistant_msg_doc['created_at'].isoformat()
    await db.chat_messages.insert_one(assistant_msg_doc)
    
    return ChatResponse(response=response_text)

@api_router.get("/chat/history", response_model=List[ChatMessage])
async def get_chat_history(user_id: str = Depends(get_current_user)):
    messages = await db.chat_messages.find({"user_id": user_id}, {"_id": 0}).sort("created_at", 1).limit(100).to_list(100)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

# ============ GOALS ROUTES ============

@api_router.post("/goals", response_model=FinanceGoal)
async def create_goal(goal_data: GoalRequest, user_id: str = Depends(get_current_user)):
    goal = FinanceGoal(
        user_id=user_id,
        goal=goal_data.goal,
        target_amount=goal_data.target_amount,
        deadline=goal_data.deadline
    )
    
    goal_doc = goal.model_dump()
    goal_doc['created_at'] = goal_doc['created_at'].isoformat()
    await db.goals.insert_one(goal_doc)
    
    return goal

@api_router.get("/goals", response_model=List[FinanceGoal])
async def get_goals(user_id: str = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for goal in goals:
        if isinstance(goal.get('created_at'), str):
            goal['created_at'] = datetime.fromisoformat(goal['created_at'])
    
    return goals

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    result = await db.goals.delete_one({"id": goal_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
