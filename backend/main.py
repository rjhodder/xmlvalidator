from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from lxml import etree
from io import StringIO
import csv
from fastapi.responses import StreamingResponse

app = FastAPI()

# Allow CORS from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/validate")
async def validate(xml: UploadFile = File(...), xsd: UploadFile = File(...)):
    """Original validation for inline highlighting"""
    xml_doc = etree.parse(xml.file)
    xsd_doc = etree.XMLSchema(etree.parse(xsd.file))
    errors = []

    try:
        xsd_doc.assertValid(xml_doc)
        status = "PASS"
    except etree.DocumentInvalid as e:
        status = "FAIL"
        errors = [str(err) for err in e.error_log]

    return {"status": status, "errors": errors}

@app.post("/validate_csv")
async def validate_csv(xml: UploadFile = File(...), xsd: UploadFile = File(...)):
    """Generate element-by-element CSV validation report"""
    xml_doc = etree.parse(xml.file)
    xsd_doc = etree.XMLSchema(etree.parse(xsd.file))

    results = []
    for elem in xml_doc.iter():
        try:
            xsd_doc.assertValid(elem)
            results.append({
                "element": elem.tag,
                "line": elem.sourceline,
                "status": "PASS",
                "message": ""
            })
        except etree.DocumentInvalid as e:
            results.append({
                "element": elem.tag,
                "line": elem.sourceline,
                "status": "FAIL",
                "message": str(e.error_log) if hasattr(e, "error_log") else str(e)
            })

    # Convert results to CSV
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["element", "line", "status", "message"])
    writer.writeheader()
    for r in results:
        writer.writerow(r)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=validation-report.csv"}
    )
