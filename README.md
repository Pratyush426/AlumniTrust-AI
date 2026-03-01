# AlumniTrust AI 🛡️
### Structured Questionnaire Answering Tool (GTM Engineering Assignment)

> **Built for Almabase** — Automate Higher-Ed Security Questionnaire (HECVAT) responses using your own Trust Center documents as the knowledge source.

---

## 🏢 Context Setup

**Industry Chosen:** Higher Education EdTech (SaaS)

**Fictional Company Description:**
AlumniTrust (a fictional product suite by Almabase) provides alumni networking and fundraising platforms directly to university advancement teams. Because we handle sensitive alumni donor data and student records, university procurement teams frequently require us to fill out massive HECVAT (Higher Education Community Vendor Assessment Toolkit) security questionnaires before they can purchase our software.

---

## 🛠️ What I Built (Phase 1 & Phase 2 Complete)

I built an end-to-end full-stack application that automates the answering of structured security questionnaires (like HECVATs) using Retrieval-Augmented Generation (RAG). 

**Key Features Implemented:**
- **User Authentication:** Secure signup and login flow (JWT/SQLite).
- **Persistent Data Storage:** SQLite database manages Users, Documents, Tasks, and generated Answers.
- **Document Management:** Users can upload reference documents (text/PDF/docs) which are chunked, embedded, and stored in a local ChromaDB vector store.
- **Workflow Automation:** Users upload a CSV/XLSX questionnaire. The system parses the questions, queries the vector DB for context, and uses an LLM to generate grounded answers.
- **Citation & Fallback:** Every answer includes the source document. If no relevant context is found (cosine similarity < 0.30), the AI strictly returns "Not found in references."
- **Review Dashboard (Phase 2):** A dedicated UI where users can view the full question, full AI answer, confidence score, and citation snippet. Users can manually edit the answers inline.
- **Export (Phase 2):** Users can export the final reviewed Q&A pairs into a cleanly formatted `.docx` file that maintains the original questionnaire structure.
- **Bonus Features Implemented:** Confidence Scores (Avg similarity), Evidence Snippets (Hover tooltips), and Coverage Summaries (Dashboard stat blocks).

---

## 📦 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Gemini API Key (or OpenAI API Key)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r ../requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY (for Gemini)

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

## 🧠 Assumptions Made

1. **Questionnaire Format:** I assumed that initial questionnaires can be provided structurally (e.g., CSV with a "Question" column) to easily parse them without needing OCR or complex document visual parsing.
2. **Reviewer Role:** I assumed the tool is a "co-pilot" for a GTM/Sales Engineer, not an autonomous agent. The output is meant to be 80% draft quality, requiring human review before sending to a university CISO.
3. **Local Vector Store:** I assumed a local ChromaDB instance is sufficient for the scope of this assignment rather than requiring a cloud vector database like Pinecone.

---

## ⚖️ Trade-offs

1. **Vector Search Threshold (0.30) vs. Strictness**
   - *Trade-off:* A higher threshold (0.7) only answers questions with perfect evidence but results in too many "Not found"s. A lower threshold answers more but risks hallucination.
   - *Choice:* I utilized a low threshold to pull context, but offloaded the final strictness to the LLM prompt. It's better to show a GTM engineer a partially correct answer they can edit rather than generating no helpful text at all.

2. **SQLite vs. PostgreSQL**
   - *Trade-off:* SQLite is local and zero-setup but lacks concurrent write scalability.
   - *Choice:* Chosen for MVP developer experience and ease of local testing. The usage of SQLAlchemy ORM means migrating to Postgres later is just a connection string change.

3. **Synchronous LLM Generation vs. Task Queues**
   - *Trade-off:* Iterating through 20 questions sequentially blocks the backend. A queue (Celery/Redis) with WebSockets would be non-blocking.
   - *Choice:* Built synchronously to keep the architecture simple and easy to run locally. I added generic loading states on the frontend to handle the wait time gracefully without complicating the infrastructure.

4. **Vanilla CSS/Glassmorphism vs. Component Libraries**
   - *Choice:* I built a modern, dark-theme "glassmorphism" UI from scratch (with some Tailwind utilities) instead of a rigid component library to deliver a highly polished, professional, and visually impressive aesthetic ("wow factor") suitable for a modern AI tool.

---

## 🚀 What I Would Improve With More Time

1. **Streaming Responses:** Implement WebSockets/Server-Sent Events (SSE) so the frontend Review Dashboard populates answers one-by-one in real-time as the LLM generates them, rather than waiting for the entire CSV to finish processing.
2. **Advanced Chunking Strategy:** Right now, documents are chunked by character count. With more time, I would implement semantic/structural chunking (e.g., chunking by header or paragraph) to ensure context isn't split awkwardly.
3. **Complex PDF Parsing:** Move beyond CSV questionnaires. Use something like `unstructured.io` or AWS Textract to parse wildly formatted vendor PDF forms and automatically map answers back onto the original PDF visually.
4. **"Talk to your docs" Chatbot:** Add an inline chat widget in the Review Dashboard so if an answer requires editing, the user can ask follow-up questions to the knowledge base without leaving the page.
5. **Partial Regeneration Requirement:** Add a dedicated button next to every answer card allowing the user to re-trigger the LLM generation for just that one specific question with adjusted context.
