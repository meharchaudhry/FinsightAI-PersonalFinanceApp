FinsightAI — Personal Finance Management App
A full-stack AI-powered personal finance platform that digitises receipts and provides personalised financial guidance through a conversational AI advisor.

# Features
Receipt Digitisation — Upload receipt images; Gemini Vision AI automatically extracts vendor, items, prices, dates, and GST and categorises into 8 spending categories
Financial Analytics — Total spending breakdowns, category-wise analysis, and monthly trend tracking
AI Financial Advisor — Gemini-powered chatbot with full context of your receipt history, spending patterns, and active goals to give personalised recommendations
Goals Tracking — Set and track savings goals with target amounts and deadlines
Authentication — JWT-based auth with bcrypt password hashing

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend
cd frontend
npm install
npm run dev

#Environment Variables
Create a .env file in /backend:

GEMINI_API_KEY=your_key_here
MONGODB_URL=your_mongodb_url
JWT_SECRET=your_secret_here
