import os
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI()

OUTPUT_DIR = os.getenv("OUTPUT_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "output"))
os.makedirs(OUTPUT_DIR, exist_ok=True)


class SheetPayload(BaseModel):
    name: str = Field(default="Sheet1", min_length=1)
    rows: list[list[Any]] = Field(default_factory=list)


class ExcelRequest(BaseModel):
    title: str = Field(..., min_length=1)
    sheets: list[SheetPayload] = Field(default_factory=list)


class ExcelAnalyzeRequest(BaseModel):
    file_name: str = Field(..., min_length=1)


class ExcelToWordRequest(BaseModel):
    file_name: str = Field(..., min_length=1)
    title: str = Field(default="Excel Report")


@app.get("/")
def health():
    return {"status": "excel service running", "output_dir": OUTPUT_DIR}


@app.get("/files/{file_name}")
def download_file(file_name: str):
    file_path = os.path.join(OUTPUT_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, filename=file_name)


def _safe_filename(name: str) -> str:
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in (" ", "-", "_"))
    return cleaned.strip().replace(" ", "_") or "workbook"


def _must_exist(file_name: str) -> str:
    path = os.path.join(OUTPUT_DIR, file_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return path


@app.post("/edit")
def create_excel(req: ExcelRequest):
    Workbook = __import__("openpyxl").Workbook
    wb = Workbook()

    if req.sheets:
        # Reuse default sheet for first payload and create the rest.
        first = req.sheets[0]
        ws = wb.active
        ws.title = first.name[:31]
        for row in first.rows:
            ws.append(row)

        for sheet in req.sheets[1:]:
            ws_extra = wb.create_sheet(title=sheet.name[:31])
            for row in sheet.rows:
                ws_extra.append(row)
    else:
        ws = wb.active
        ws.title = "Summary"
        ws.append(["Status", "Message"])
        ws.append(["ok", "Workbook created with empty payload"])

    file_name = f"{_safe_filename(req.title)}.xlsx"
    file_path = os.path.join(OUTPUT_DIR, file_name)
    wb.save(file_path)

    return {
        "message": "Workbook created",
        "file_path": file_path,
        "file_name": file_name,
        "sheet_count": len(wb.sheetnames),
        "sheets": wb.sheetnames,
    }


@app.post("/analyze")
def analyze_excel(req: ExcelAnalyzeRequest):
    load_workbook = __import__("openpyxl", fromlist=["load_workbook"]).load_workbook
    file_path = _must_exist(req.file_name)
    wb = load_workbook(file_path, data_only=True)

    summary = []
    for sheet in wb.worksheets:
        rows = list(sheet.iter_rows(values_only=True))
        row_count = len(rows)
        col_count = max((len(r) for r in rows), default=0)

        numeric_count = 0
        numeric_sum = 0.0
        for row in rows:
            for cell in row:
                if isinstance(cell, (int, float)):
                    numeric_count += 1
                    numeric_sum += float(cell)

        summary.append({
            "sheet": sheet.title,
            "rows": row_count,
            "columns": col_count,
            "numeric_cells": numeric_count,
            "numeric_sum": numeric_sum,
        })

    return {
        "file_name": req.file_name,
        "sheet_count": len(summary),
        "summary": summary,
    }


@app.post("/to-word")
def excel_to_word(req: ExcelToWordRequest):
    load_workbook = __import__("openpyxl", fromlist=["load_workbook"]).load_workbook
    Document = __import__("docx", fromlist=["Document"]).Document

    file_path = _must_exist(req.file_name)
    wb = load_workbook(file_path, data_only=True)

    doc = Document()
    doc.add_heading(req.title, 0)
    doc.add_paragraph(f"Source workbook: {req.file_name}")

    for sheet in wb.worksheets:
        doc.add_heading(sheet.title, level=1)
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            doc.add_paragraph("(empty sheet)")
            continue

        max_cols = max(len(r) for r in rows)
        table = doc.add_table(rows=min(len(rows), 25), cols=max_cols)
        table.style = "Light List"

        for r_idx, row in enumerate(rows[:25]):
            for c_idx in range(max_cols):
                value = row[c_idx] if c_idx < len(row) else ""
                table.cell(r_idx, c_idx).text = "" if value is None else str(value)

        if len(rows) > 25:
            doc.add_paragraph(f"... truncated {len(rows) - 25} rows")

    out_name = f"{os.path.splitext(req.file_name)[0]}_report.docx"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    doc.save(out_path)

    return {
        "message": "Word report generated from Excel",
        "source_file": req.file_name,
        "file_name": out_name,
        "file_path": out_path,
    }
