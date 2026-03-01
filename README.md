# AlumniTrust AI 🛡️
### Structured Questionnaire Answering Tool (GTM Engineering Assignment)

> **Built for Almabase** — Automate Higher-Ed Security Questionnaire (HECVAT) responses using your own Trust Center documents as the knowledge source.

---

## 📖 The Problem vs. The Solution

**The Problem:** 
GTM (Go-To-Market) and Sales Engineering teams spend countless hours manually answering massive 200+ question security questionnaires (like HECVAT or SOC2 forms) required by enterprise procurement teams. Finding the exact phrasing approved by Legal and Security across dozens of PDFs is tedious, error-prone, and slows down the sales cycle.

**The Solution:** 
AlumniTrust AI is a fully automated Retrieval-Augmented Generation (RAG) platform. Users simply upload their company's "source of truth" documents (SOC2 reports, Privacy Policies) and their blank questionnaire (CSV/Excel). The AI orchestrates a vector search to find the exact internal policies and leverages an LLM to automatically draft high-quality, grounded answers. It includes a beautiful Review Dashboard for human-in-the-loop editing before generating a final exported document.

---

## 🏢 Context Setup

**Industry Chosen:** Higher Education EdTech (SaaS)

**Fictional Company Description:**
AlumniTrust (a fictional product suite by Almabase) provides alumni networking and fundraising platforms directly to university advancement teams. Because we handle sensitive alumni donor data and student records, university procurement teams frequently require us to fill out massive HECVAT (Higher Education Community Vendor Assessment Toolkit) security questionnaires before they can purchase our software.

---

## ⚡ Key Features & Assignment Requirements Met

This project implements **100% of the Must-Have requirements** and **3 of the Nice-to-Have features**.

### Core Requirements Included:
- ✅ **User Authentication:** Complete JWT-based signup/login system backed by a SQLite database.
- ✅ **Persistent Data Storage:** Relational database (`SQLAlchemy` / SQLite) managing Users, Tasks, uploaded Documents, and generated AI Answers.
- ✅ **Document Management:** Upload reference documents which are parsed, chunked, embedded, and stored in a persistent local **ChromaDB** vector store.
- ✅ **Workflow Automation:** Upload a CSV questionnaire to instantly generate answers.
- ✅ **Grounded Citations:** The LLM strictly utilizes the vector-retrieved context. Every answer is physically tied to the filename that supplied the context.
- ✅ **Strict Fallback ("Not Found"):** If vector search cosine similarity drops below 0.30, the system bypasses the LLM and strictly returns a visually loud "Not found in references" error.
- ✅ **Review Dashboard (Phase 2):** A stunning UI where users review the AI's work. Features full-text wrapping, confidence metrics, and inline text validation.
- ✅ **Export to Final Form (Phase 2):** One-click export to a cleanly formatted `.docx` file containing the precise Question + Answer pairings ready to send to the client.

### Bonus / Nice-to-Have Features Included:
- 🌟 **1. Confidence Scores:** Displayed on every answer card based on the exact averaged cosine-similarity score from the vector database.
- 🌟 **2. Evidence Snippets:** Hovering over a citation reveals a modern dark tooltip showing the exact 300-character snippet the AI used to write its answer.
- 🌟 **3. Coverage Summary:** A dynamic stat-bar at the top of the dashboard tracking Total Questions, Answered (vs Not Found), Average Confidence, and Manually Edited counts.

---

## 💻 The Tech Stack

This project was built from scratch as a modern, high-performance web application.

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Vanilla CSS with custom Tailwind utility classes
- **UI/UX:** Hand-built "Dark Glassmorphism" aesthetic with ambient glows, responsive grids, and a completely custom deep-blue animated WebGL background (`DarkVeil`).
- **Icons:** `lucide-react`

### Backend
- **Framework:** FastAPI (Python)
- **Database (Relational):** SQLite with `SQLAlchemy` ORM
- **Database (Vector):** `ChromaDB` (Persistent local client)
- **AI / LLM:** Google Gemini (`gemini-1.5-flash`) via `langchain_google_genai`
- **Orchestration:** `LangChain` (LCEL pipes)
- **Document Processing:** `docx`, `csv`, `python-multipart`

---

## 📦 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Gemini API Key

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r ../requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and manually add your GOOGLE_API_KEY

uvicorn main:app --reload --port 8000
```

### 2. Seed the Knowledge Base (Optional)

```bash
# Load the 5 pre-built mock documents into the vector database
python backend/seed_demo_data.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│              React Frontend               │
│  (Auth · Knowledge Base · Dashboard)      │
└─────────────────┬────────────────────────┘
                  │ REST / JSON
┌─────────────────▼────────────────────────┐
│           FastAPI Backend                 │
│   Auth (JWT) · Documents · Questionnaire │
│   Tasks · Export (.docx)                 │
└────┬────────────┬──────────────┬─────────┘
     │            │              │
┌────▼────┐  ┌────▼─────┐  ┌────▼────────┐
│ SQLite  │  │ ChromaDB │  │  Gemini     │
│(SQLAlch)│  │(Cosine   │  │  1.5 Flash  │
│ Users   │  │ Dist)    │  │             │
│ Tasks   │  │ Chunks + │  │             │
│ Answers │  │ Embedds  │  │             │
└─────────┘  └──────────┘  └─────────────┘
```

---

## ⚖️ Architectural Trade-Offs

1. **Vector Search Threshold (0.30) vs. Strictness**
   - *Trade-off:* A higher threshold (0.7) only answers questions with perfect evidence but results in too many "Not found"s. A lower threshold answers more but risks hallucination.
   - *Choice:* I utilized a low threshold to pull context, but offloaded the final strictness to the LLM prompt. It's better to show a GTM engineer a partially correct answer they can edit rather than generating no helpful text at all.

2. **SQLite vs. PostgreSQL**
   - *Trade-off:* SQLite is local and zero-setup but lacks concurrent write scalability.
   - *Choice:* Chosen for MVP developer experience and ease of local testing. The usage of SQLAlchemy ORM means migrating to Postgres later is just a connection string change.

3. **Vanilla CSS/Glassmorphism vs. Component Libraries**
   - *Choice:* I built a modern, dark-theme "glassmorphism" UI from scratch (with some Tailwind utilities) instead of a rigid component library to deliver a highly polished, professional, and visually impressive aesthetic ("wow factor") suitable for a modern AI tool.

---
