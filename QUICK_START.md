# 🚀 AlumniTrust AI - Quick Start Guide

Get your HECVAT automation system running in **5 minutes**.

---

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# OR (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Create .env file with your OpenAI API key
echo OPENAI_API_KEY=sk-your-key-here > .env
echo SECRET_KEY=your-secret-key-here >> .env

# Start the server
python main.py
```

✅ Backend runs at `http://localhost:8000`

---

## Step 2: Frontend Setup (2 minutes)

```bash
# In a NEW terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ Frontend runs at `http://localhost:3000` (or `5173` for Vite)

---

## Step 3: Test the MVP (1 minute)

1. **Go to** `http://localhost:3000`
2. **Register** with test account (email: `test@example.edu`)
3. **Upload** a mock document:
   - Copy content from `mock_docs/SOC2_Compliance.txt`
   - Paste into a new `.txt` file and upload
4. **Upload questionnaire**:
   - Use `SAMPLE_QUESTIONNAIRE.csv` in the root directory
   - Watch AI generate answers with confidence scores
5. **Review answers**:
   - Hover over citations to see source snippets
   - Click "Edit" to refine answers
6. **Export**:
   - Click "Export to .docx" button
   - Download HECVAT responses document

---

## 🔑 Key Features to Check

| Feature | Location | Expected Behavior |
|---------|----------|-------------------|
| **Almabase Touch** | Header, docs tab | See "Trust Center Knowledge Base" branding |
| **Evidence UI** | Dashboard table | Hover citations to see text snippets |
| **Error Styling** | Dashboard | "Not found in references" appears bold + red |
| **Confidence Scoring** | Dashboard | Percentage score for each answer |
| **Manual Review** | Edit button | Change answers, click Save |
| **Export** | Green export button | Download .docx file |

---

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"
```bash
cd backend
pip install -r ../requirements.txt
```

### "OPENAI_API_KEY not found"
Create `backend/.env` file:
```
OPENAI_API_KEY=sk-...your-key-here...
SECRET_KEY=anything-for-dev
```

### Frontend won't connect to backend
Ensure backend is running on port 8000, frontend on port 3000.
Check CORS is enabled in `main.py` (should be by default).

### Answers are "Not found in references"
- Ensure documents are uploaded BEFORE uploading questionnaire
- Documents need to contain actual answers to the questions
- Check console for similarity scores

---

## 📝 Database

SQLite database (`alumnistrust.db`) is auto-created on first run.

To reset:
```bash
# In backend directory
rm alumnistrust.db
python main.py
```

---

## 🔐 Security for Development

⚠️ These are DEV defaults. For production:
- [ ] Change `SECRET_KEY` in `main.py`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set `CORS_ORIGINS` to actual domain
- [ ] Enable HTTPS/TLS
- [ ] Implement rate limiting

---

## 📚 Next Steps

1. **Test with real documents**: Add your own SOC2, FERPA docs
2. **Customize questions**: Edit `SAMPLE_QUESTIONNAIRE.csv`
3. **Adjust confidence threshold**: Modify `SIMILARITY_THRESHOLD` in `engine.py` (default: 0.7)
4. **Use different LLM**: Replace `ChatOpenAI` with Claude, Llama, etc. in `engine.py`

---

## 💬 Sample Workflow

```
1. Create account
   ↓
2. Upload reference docs (SOC2, FERPA, CRM Sync, etc.)
   ↓
3. Upload HECVAT questionnaire (.csv)
   ↓
4. Wait ~2 minutes for AI processing
   ↓
5. Review answers in dashboard
   ↓
6. Edit low-confidence answers manually
   ↓
7. Export to .docx for submission
```

---

## ✨ What Makes This MVP Special for Almabase

✓ **Trust Center Knowledge Base** - Dedicated space for reference docs  
✓ **Evidence Snippets** - Clickable citations with actual text  
✓ **Red "Not Found" Styling** - Clear visual warning for missing answers  
✓ **Manual Review Dashboard** - Full control before export  
✓ **Confidence Scoring** - Know which answers need review  

---

**You're all set!** 🎉 Start building compliance automation today.

Questions? Check [README.md](README.md) for full documentation.
