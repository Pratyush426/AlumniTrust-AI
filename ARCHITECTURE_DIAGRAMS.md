# System Architecture & Data Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User Browser (React)                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Login    │  │  Trust Center │  │  Dashboard   │  │  Export      │  │
│  │  Register  │  │  Knowledge    │  │  Review      │  │  .docx       │  │
│  │            │  │  Base Upload  │  │  Answers     │  │  Download    │  │
│  └────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬──────────────────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS
                      │
┌─────────────────────▼──────────────────────────────────────────────────┐
│                     FastAPI Backend (Python)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Routes:                                                         │   │
│  │  - POST /api/auth/register          JWT token creation        │   │
│  │  - POST /api/auth/login             User authentication      │   │
│  │  - POST /api/documents/upload       Ingest reference docs    │   │
│  │  - GET  /api/documents              List user documents      │   │
│  │  - POST /api/questionnaire/upload   Process HECVAT CSV       │   │
│  │  - GET  /api/tasks/{id}             Get answers & metadata   │   │
│  │  - PUT  /api/answers/{id}           Edit answer (manual)     │   │
│  │  - GET  /api/tasks/{id}/export      Export to .docx          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐          │
│  │  RAG Engine     │  │  Auth        │  │  Export Builder  │          │
│  │  (engine.py)    │  │  (JWT/bcrypt)│  │  (python-docx)   │          │
│  └────────┬────────┘  └──────────────┘  └──────────────────┘          │
│           │                                                             │
│  ┌────────▼────────────────────────────────────────────────┐           │
│  │ LangChain + OpenAI Integration                          │           │
│  │  1. Retrieve top-2 chunks from ChromaDB                │           │
│  │  2. Format context + question as prompt                │           │
│  │  3. Call GPT-4o-mini API                               │           │
│  │  4. Parse response + confidence score                  │           │
│  │  5. Check similarity threshold (0.7)                   │           │
│  │  6. Return "Not found" if confidence too low           │           │
│  └────────┬─────────────────────────────────────────────────┘           │
│           │                                                             │
└───────────┼─────────────────────────────────────────────────────────────┘
            │
     ┌──────┴──────────────────────────┐
     │                                  │
┌────▼─────────────────┐      ┌────────▼──────────────┐
│     SQLite DB        │      │    ChromaDB           │
│   (users, tasks,     │      │   (Vector Store)      │
│    documents,        │      │                       │
│    answers)          │      │  - Document chunks   │
│                      │      │  - Embeddings        │
│                      │      │  - Metadata          │
│                      │      │                      │
│ ┌──────────────────┐ │      │ ┌──────────────────┐ │
│ │ User table       │ │      │ │ Collection:      │ │
│ │ Document table   │ │      │ │ alumnistrust_    │ │
│ │ Task table       │ │      │ │ docs (cosine)    │ │
│ │ Answer table     │ │      │ │                  │ │
│ └──────────────────┘ │      │ └──────────────────┘ │
└──────────────────────┘      └─────────────────────┘
```

---

## 📊 Data Flow: Processing a Questionnaire

```
User uploads SAMPLE_QUESTIONNAIRE.csv
        │
        ▼
┌──────────────────────────────────────┐
│ FastAPI /api/questionnaire/upload    │
│ - Validate file format               │
│ - Create Task record (status=pending)│
│ - Queue background job               │
└──────────────────────────────────────┘
        │
        ▼        (Background Task)
┌──────────────────────────────────────────────────────────┐
│ process_questionnaire_task(user_id, task_id, content)   │
│ - Parse CSV/XLSX with Pandas                            │
│ - Extract questions from first column                   │
│ - Update Task status = "processing"                     │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ batch_process_questionnaire(questions, user_id)         │
│ Loop through each question:                             │
└──────────────────────────────────────────────────────────┘
        │
        ├─→ Question 1: "How do you encrypt data at rest?"
        │   │
        │   ▼
        │   ┌─────────────────────────────────────────────┐
        │   │ generate_answer(question, "", user_id)      │
        │   └──────────────┬────────────────────────────┬
        │                  │                            │
        │         ┌────────▼─────────┐      ┌──────────▼────────┐
        │         │ retrieve_context │      │ Confidence Check   │
        │         │ (ChromaDB query) │      │                    │
        │         │                  │      │ if similarity <0.7:│
        │         │ Query: question  │      │   return "Not     │
        │         │ Filter: user_id  │      │   found"           │
        │         │ Top-K: 2         │      └────────────────────┘
        │         │                  │
        │         │ Results:         │
        │         │ - SOC2_Compliance│
        │         │   (sim: 0.89)    │
        │         │ - FERPA_Privacy  │
        │         │   (sim: 0.72)    │
        │         └────────┬─────────┘
        │                  │
        │         ┌────────▼────────────────────────┐
        │         │ LangChain RAG Prompt            │
        │         │ Template:                       │
        │         │  CONTEXT: [2 chunks]           │
        │         │  QUESTION: user's question     │
        │         │  → Generate answer             │
        │         └────────┬─────────────────────┬──┘
        │                  │                     │
        │         ┌────────▼──────────┐  ┌──────▼────────────┐
        │         │ OpenAI API Call   │  │ Calc Confidence   │
        │         │                   │  │                   │
        │         │ GPT-4o-mini       │  │ = avg similarity  │
        │         │ ($0.00015/token)  │  │ = 0.805 = 80.5%  │
        │         └────────┬──────────┘  └───────────────────┘
        │                  │
        │         ┌────────▼──────────────────────────┐
        │         │ Save to Answer Table              │
        │         │ - question: "How do you encrypt..."
        │         │ - ai_answer: "AES-256 encryption..."
        │         │ - confidence: 0.805               │
        │         │ - source_doc: "SOC2_Compliance"   │
        │         │ - source_snippet: "All data is... │
        │         └────────┬─────────────────────────┘
        │                  │
        ├─→ Question 2: "Are you FERPA compliant?"
        │   │
        │   ▼ (same flow...)
        │   │
        │   └─→ Answer saved: confidence 0.92, source: FERPA_Privacy
        │
        ├─→ Question 3 ... through N
        │
        ▼
┌─────────────────────────────────────────┐
│ Update Task Status = "completed"        │
│ Frontend polls and gets answers         │
└─────────────────────────────────────────┘
```

---

## 🔄 User Review & Export Flow

```
┌─────────────────────────────────┐
│ Dashboard loads answers from DB │
│ (via GET /api/tasks/{id})       │
└────────────────┬────────────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
    ▼                           ▼
┌──────────────┐        ┌──────────────────┐
│ Review Mode  │        │ Citation Tooltip │
│              │        │                  │
│ Table shows: │        │ On hover:        │
│ ┌──────────┐ │        │ Shows black modal│
│ │Question  │ │        │ with actual      │
│ │─────────│ │        │ text snippet:    │
│ │Answer   │ │        │                  │
│ │─────────│ │        │ "All data is     │
│ │Citation │ │        │  encrypted at    │
│ │─────────│ │        │  rest using      │
│ │Confid.% │ │        │  AES-256"        │
│ │─────────│ │        │                  │
│ │[Edit]   │ │        │                  │
│ └──────────┘ │        │                  │
└──────────────┘        └──────────────────┘
    │
    ▼ (If confidence < 70%)
┌──────────────────────────┐
│ "Not found in references"│
│ Shows in BOLD RED        │
│ (.font-bold .text-red-600)
└──────────────────────────┘
    │
    ▼ (Editing)
┌──────────────────────────────────┐
│ Click [Edit] button              │
│ Textarea appears                 │
│ User modifies answer             │
│ Click [Save]                     │
│ Updates Answer.manual_answer     │
│ Sets Answer.has_been_edited=True │
└──────────────────────────────────┘
    │
    ▼ (Export)
┌──────────────────────────────────┐
│ Click [Export to .docx]          │
│ GET /api/tasks/{id}/export       │
└──────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────┐
│ python-docx generates .docx        │
│                                    │
│ Document structure:                │
│ ┌────────────────────────────────┐ │
│ │ HECVAT Responses               │ │
│ │ Generated: 2026-03-01 10:30 UTC│ │
│ ├────────────────────────────────┤ │
│ │ Q: How do you encrypt...       │ │
│ │ A: AES-256 encryption...       │ │
│ │ Confidence: 80.5% | Src: SOC2  │ │
│ │                                │ │
│ │ Q: Are you FERPA compliant?    │ │
│ │ A: Not found in references     │ │
│ │    ↑ BOLD RED TEXT             │ │
│ │ Confidence: 0.0% | Src: N/A    │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Browser downloads .docx file    │
│ filename: task_name + "_HECVAT  │
│ _responses.docx"                │
└─────────────────────────────────┘
```

---

## 🔐 Authentication & Session Flow

```
┌──────────────────────────┐
│ User visits app          │
│ Checks localStorage      │
│ Has valid token? → No   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Redirect to Login/Register page  │
└──────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐   ┌──────────┐
│ Login   │   │ Register │
│         │   │          │
│ Email   │   │ Username │
│ Password│   │ Email    │
│         │   │ Password │
└────┬────┘   └────┬─────┘
     │             │
     │    ┌────────┘
     │    │
     │    ▼
     │ ┌─────────────────────────────┐
     │ │ POST /api/auth/register OR │
     │ │ POST /api/auth/login        │
     │ └─────────────┬───────────────┘
     │               │
     │    ┌──────────▼──────────┐
     │    │ Backend validates   │
     │    │ Hash password       │
     │    │ Create JWT token    │
     │    │ Return：            │
     │    │ {                   │
     │    │  access_token: "...",
     │    │  user_id: 123,      │
     │    │  username: "jane"   │
     │    │ }                   │
     │    └──────────┬──────────┘
     │               │
     │    ┌──────────▼──────────────┐
     │    │ Frontend stores in LS:  │
     │    │ token, userId, username │
     │    └──────────┬──────────────┘
     │               │
     │               ▼
     │    ┌──────────────────────┐
     │    │ Redirect to /docs tab│
     │    │ (authenticated state)│
     │    └──────────────────────┘
     │
     │ (All subsequent API calls)
     │
     ├─→ Authorization: Bearer {token}
     │
     └─→ Backend decodes JWT
         Validates signature
         Extracts user_id
         >>> Authorized ✓
```

---

## 📈 Confidence Score Calculation

```
Question: "How do you encrypt data at rest?"
     │
     ▼
ChromaDB Semantic Search
     │
     ├─→ Chunk 1: "All data is encrypted at rest using AES-256..."
     │   Distance: 0.14 → Similarity: 1 - 0.14 = 0.86
     │
     ├─→ Chunk 2: "Encryption keys are managed through AWS KMS..."
     │   Distance: 0.28 → Similarity: 1 - 0.28 = 0.72
     │
     └─→ (No more chunks with similarity > threshold in top-2)
     │
     ▼
Average Similarity = (0.86 + 0.72) / 2 = 0.79
     │
     ├─→ Is 0.79 >= THRESHOLD (0.7)? YES ✓
     │
     ├─→ Send to LLM with this context
     │   ↓
     │   OpenAI returns: "AES-256 encryption..."
     │
     ▼
Answer Generated with 79% Confidence
```

**What if similarity was 0.65?**
```
Average Similarity = 0.65
     │
     ├─→ Is 0.65 >= THRESHOLD (0.7)? NO ✗
     │
     ▼
Return: "Not found in references" with 0% confidence
```

---

## 🗄️ Database Schema (Simplified)

```
┌─────────────────────┐
│      USERS          │
├─────────────────────┤
│ id (PK)             │
│ email (UNIQUE)      │
│ username (UNIQUE)   │
│ hashed_password     │
│ created_at          │
└────────┬────────────┘
         │ 1:N
         │
         ├──────┬─────────┐
         │      │         │
         │      │         ▼
         │      │    ┌──────────────────┐
         │      │    │    DOCUMENTS     │
         │      │    ├──────────────────┤
         │      │    │ id (PK)          │
         │      │    │ user_id (FK)     │
         │      │    │ filename         │
         │      │    │ file_path        │
         │      │    │ content          │
         │      │    │ created_at       │
         │      │    └────────┬─────────┘
         │      │             │ 1:N
         │      │             │
         │      │             ▼
         │      │    ┌─────────────────────┐
         │      │    │ DOCUMENT_CHUNKS     │
         │      │    ├─────────────────────┤
         │      │    │ id (PK)             │
         │      │    │ document_id (FK)    │
         │      │    │ chunk_text          │
         │      │    │ chunk_index         │
         │      │    │ embedding_id*       │
         │      │    * (reference to ChromaDB)
         │      │    └─────────────────────┘
         │      │
         │      ▼
         │   ┌───────────────┐
         │   │    TASKS      │
         │   ├───────────────┤
         │   │ id (PK)       │
         │   │ user_id (FK)  │
         │   │ task_name     │
         │   │ file_path     │
         │   │ status*       │
         │   │ created_at    │
         │   │ * pending|processing|completed
         │   └───────┬───────┘
         │           │ 1:N
         │           │
         │           ▼
         │       ┌──────────────────┐
         │       │    ANSWERS       │
         │       ├──────────────────┤
         │       │ id (PK)          │
         │       │ task_id (FK)     │
         │       │ user_id (FK)     │
         │       │ question         │
         │       │ ai_answer        │
         │       │ confidence_score │
         │       │ source_document  │
         │       │ source_snippet   │
         │       │ has_been_edited  │
         │       │ manual_answer    │
         │       │ created_at       │
         │       └──────────────────┘
         │
         └────────────────────────┘
```

---

## 🔄 File Upload Handling

```
Browser
   │
   ├─ POST /api/documents/upload
   │  (FormData: file + token)
   │
   ▼
FastAPI
   │
   ├─ Authenticate (decode JWT from token)
   ├─ Read file bytes
   ├─ Decode to UTF-8 text
   │
   ▼
Save to SQLite
   │
   ├─ INSERT Document record
   │  (filename, file_path, content, user_id)
   │
   ├─ db.commit() & refresh
   │
   ▼
Pass to RAG Engine
   │
   ├─ ingest_document(
   │    document_text,
   │    filename,
   │    user_id,
   │    doc.id
   │  )
   │
   ▼
Chunk & Embed
   │
   ├─ RecursiveCharacterTextSplitter
   │  (chunk_size=500, overlap=100)
   │
   ├─ Split into ~5-10 chunks
   │
   ▼
Add to ChromaDB
   │
   ├─ For each chunk:
   │  ├─ chunk_id = "user_{id}_doc_{id}_chunk_{i}"
   │  ├─ OpenAI embeddings (auto, via Chroma)
   │  ├─ collection.add(
   │  │   ids=[chunk_id],
   │  │   documents=[chunk],
   │  │   metadatas=[{user_id, doc_id, filename}]
   │  │ )
   │
   ▼
Return to Frontend
   │
   ├─ Response:
   │  {
   │    "message": "uploaded to Trust Center...",
   │    "document_id": 1,
   │    "filename": "SOC2_Compliance.txt"
   │  }
   │
   ▼
Display Success
   │
   └─ "✓ SOC2_Compliance.txt uploaded..."
```

---

## 🌐 API Call Example: Full Journey

```javascript
// 1. Register
POST http://localhost:8000/api/auth/register
{
  "username": "alum_admin",
  "email": "admin@institution.edu",
  "password": "SecurePass123!"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 1,
  "username": "alum_admin"
}

// 2. Upload Reference Document
POST http://localhost:8000/api/documents/upload
Headers: {
  "Content-Type": "multipart/form-data"
}
Body:
  file: <SOC2_Compliance.txt>
  token: <access_token>

Response:
{
  "message": "Document uploaded successfully to Trust Center Knowledge Base",
  "document_id": 1,
  "filename": "SOC2_Compliance.txt"
}

// 3. Upload Questionnaire
POST http://localhost:8000/api/questionnaire/upload
Headers:
  "Content-Type": "multipart/form-data"
Body:
  file: <SAMPLE_QUESTIONNAIRE.csv>
  task_name: "Q1_2026_HECVAT"
  token: <access_token>

Response:
{
  "task_id": 1,
  "message": "Questionnaire uploaded and processing started",
  "status": "processing"
}

// 4. Poll for Results (every 2 seconds)
GET http://localhost:8000/api/tasks/1
Headers:
  "Authorization": "Bearer <access_token>"

Response (when complete):
{
  "id": 1,
  "task_name": "Q1_2026_HECVAT",
  "status": "completed",
  "created_at": "2026-03-01T10:30:00",
  "answers": [
    {
      "id": 1,
      "question": "How do you encrypt data at rest?",
      "ai_answer": "All data is encrypted at rest using AES-256 encryption...",
      "confidence_score": 0.89,
      "source_document": "SOC2_Compliance.txt",
      "source_snippet": "All data is encrypted at rest using AES-256...",
      "has_been_edited": false,
      "manual_answer": null
    },
    {
      "id": 2,
      "question": "Are you FERPA compliant?",
      "ai_answer": "Not found in references",
      "confidence_score": 0.0,
      "source_document": "N/A",
      "source_snippet": "",
      "has_been_edited": false,
      "manual_answer": null
    }
  ]
}

// 5. Edit Answer
PUT http://localhost:8000/api/answers/2
Headers:
  "Content-Type": "application/json"
  "Authorization": "Bearer <access_token>"
Body:
{
  "manual_answer": "We are fully FERPA compliant as per FERPA_Privacy.txt"
}

Response:
{
  "id": 2,
  "question": "Are you FERPA compliant?",
  "ai_answer": "Not found in references",
  "manual_answer": "We are fully FERPA compliant...",
  "confidence_score": 0.0,
  "has_been_edited": true,
  ...
}

// 6. Export
GET http://localhost:8000/api/tasks/1/export
Headers:
  "Authorization": "Bearer <access_token>"

Response: Binary .docx file (download)
Filename: Q1_2026_HECVAT_HECVAT_responses.docx
```

---

This completes the **AlumniTrust AI MVP Architecture** documentation. All diagrams are ASCII-based for readability in markdown and version control.

