import os
from fastapi import FastAPI
from pydantic import BaseModel
from docx import Document

app = FastAPI()


# 🔥 ruta absoluta hacia /orbit/db
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "db")

# crear carpeta si no existe
os.makedirs(DB_PATH, exist_ok=True)


class DocRequest(BaseModel):
    title: str
    content: str


@app.get("/")
def health():
    return {"status": "doc service running"}


@app.post("/edit")
def create_doc(req: DocRequest):

    doc = Document()

    doc.add_heading(req.title, 0)
    doc.add_paragraph(req.content)

    filename = f"{req.title.replace(' ', '_')}.docx"
    file_path = os.path.join(DB_PATH, filename)

    doc.save(file_path)

    return {
        "message": "Document created",
        "file_path": file_path
    }