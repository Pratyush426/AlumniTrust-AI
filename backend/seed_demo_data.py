"""
Seed script to populate the database with mock documents for demo purposes.

Run this AFTER the backend server has started to populate mock reference documents.
This is optional - you can also manually upload documents through the UI.

Usage:
    python seed_demo_data.py
"""

import os
import glob
import sys

# Force UTF-8 output on Windows terminals (fixes cp1252 emoji/checkmark crash)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from models import SessionLocal, User, Document
from engine import ingest_document
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_demo_user():
    """Create a demo user if one doesn't exist."""
    db = SessionLocal()
    
    # Check if demo user exists
    demo_user = db.query(User).filter(User.email == "demo@almabase.edu").first()
    if demo_user:
        print(f"✓ Demo user already exists (ID: {demo_user.id})")
        db.close()
        return demo_user.id
    
    # Create demo user
    demo_user = User(
        username="demo_admin",
        email="demo@almabase.edu",
        hashed_password=pwd_context.hash("DemoPassword123!")
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)
    
    print(f"✓ Created demo user: demo@almabase.edu (password: DemoPassword123!)")
    print(f"  User ID: {demo_user.id}")
    
    db.close()
    return demo_user.id


def seed_documents(user_id: int):
    """Ingest all mock documents from the mock_docs directory."""
    db = SessionLocal()
    mock_docs_dir = "../mock_docs"
    
    if not os.path.exists(mock_docs_dir):
        print(f"❌ Could not find {mock_docs_dir} directory")
        db.close()
        return
    
    doc_files = glob.glob(os.path.join(mock_docs_dir, "*.txt"))
    
    if not doc_files:
        print(f"❌ No .txt files found in {mock_docs_dir}")
        db.close()
        return
    
    print(f"\nIngesting {len(doc_files)} reference documents...")
    
    for doc_path in doc_files:
        filename = os.path.basename(doc_path)
        
        # Check if document already exists
        existing_doc = db.query(Document).filter(
            (Document.user_id == user_id) & (Document.filename == filename)
        ).first()
        
        if existing_doc:
            print(f"  ✓ {filename} (already exists)")
            continue
        
        # Read document content
        with open(doc_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Create document record
        doc = Document(
            user_id=user_id,
            filename=filename,
            file_path=f"/mock_docs/{filename}",
            content=content
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        # Ingest into vector store
        try:
            ingest_document(content, filename, user_id, doc.id)
            print(f"  ✓ {filename} (ingested into vector store)")
        except Exception as e:
            print(f"  ❌ {filename} (error: {str(e)})")
            db.delete(doc)
            db.commit()
    
    db.close()


def main():
    """Run the seed process."""
    print("=" * 60)
    print("AlumniTrust AI - Demo Data Seeder")
    print("=" * 60)
    
    # Create demo user
    user_id = seed_demo_user()
    
    # Ingest mock documents
    seed_documents(user_id)
    
    print("\n" + "=" * 60)
    print("✅ Demo data seeded successfully!")
    print("=" * 60)
    print("\nYou can now log in with:")
    print("  Email: demo@almabase.edu")
    print("  Password: DemoPassword123!")
    print("\nOr register a new account through the UI.")
    print("\n📄 Documents:")
    print("  - SOC2_Compliance.txt")
    print("  - FERPA_Privacy.txt")
    print("  - CRM_Sync_Architecture.txt")
    print("  - Data_Retention.txt")
    print("  - SSO_MFA.txt")
    print("\n📝 Next: Upload SAMPLE_QUESTIONNAIRE.csv to test the RAG pipeline")


if __name__ == "__main__":
    main()
