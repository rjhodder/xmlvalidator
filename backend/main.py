from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from io import StringIO
import csv
from lxml import etree

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


def get_xpath(elem):
    """Generate XPath string for an element."""
    path_parts = []
    while elem is not None and hasattr(elem, "tag"):
        if not isinstance(elem.tag, str):
            break
        tag = etree.QName(elem).localname
        parent = elem.getparent()
        if parent is not None:
            siblings = [sib for sib in parent if sib.tag == elem.tag]
            if len(siblings) > 1:
                index = siblings.index(elem) + 1
                path_parts.insert(0, f"{tag}[{index}]")
            else:
                path_parts.insert(0, tag)
        else:
            path_parts.insert(0, tag)
        elem = parent
    return "/" + "/".join(path_parts)


@app.post("/validate_csv")
async def validate_csv(xml: UploadFile = File(...), xsd: UploadFile = File(...)):
    """Enhanced CSV report validation — now includes element values and safe parsing."""
    results = []
    total = passed = failed = 0

    # --- Safe XML/XSD parsing ---
    try:
        xml_doc = etree.parse(xml.file)
    except Exception as e:
        return StreamingResponse(
            StringIO(f"element,line,status,value,message\nN/A,N/A,FAIL,,Invalid XML: {str(e)}"),
            media_type="text/csv"
        )

    try:
        schema_tree = etree.parse(xsd.file)
        schema_root = schema_tree.getroot()
        xsd_doc = etree.XMLSchema(schema_root)
    except Exception as e:
        return StreamingResponse(
            StringIO(f"element,line,status,value,message\nN/A,N/A,FAIL,,Invalid XSD: {str(e)}"),
            media_type="text/csv"
        )

    schema_ns = schema_root.get("targetNamespace")

    # --- Full document validation ---
    try:
        xsd_doc.assertValid(xml_doc)
        results.append({
            "element": etree.QName(xml_doc.getroot()).localname,
            "line": xml_doc.getroot().sourceline or "",
            "status": "PASS",
            "value": xml_doc.getroot().text.strip() if xml_doc.getroot().text else "",
            "message": "Document is valid"
        })
        passed += 1
    except etree.DocumentInvalid as e:
        failed += 1
        results.append({
            "element": etree.QName(xml_doc.getroot()).localname,
            "line": xml_doc.getroot().sourceline or "",
            "status": "FAIL",
            "value": xml_doc.getroot().text.strip() if xml_doc.getroot().text else "",
            "message": str(e.error_log.last_error) if e.error_log else str(e)
        })
    total += 1

    # --- Element-by-element validation ---
    for elem in xml_doc.getroot().iter():
        if not isinstance(elem.tag, str):
            continue
        total += 1
        q_elem = etree.QName(elem)
        elem_ns = q_elem.namespace or ""
        elem_value = elem.text.strip() if elem.text and elem.text.strip() else ""

        # Include attribute values if present
        if elem.attrib:
            attr_text = ", ".join([f'{k}="{v}"' for k, v in elem.attrib.items()])
            elem_value = f"{elem_value} [{attr_text}]" if elem_value else f"[{attr_text}]"

        found_match = False
        for e in schema_root.iter("{http://www.w3.org/2001/XMLSchema}element"):
            name = e.get("name")
            if not name:
                continue
            q_schema_elem = etree.QName(schema_ns, name)
            if (q_elem.localname == q_schema_elem.localname) and (elem_ns == schema_ns):
                found_match = True
                break

        if found_match:
            passed += 1
            results.append({
                "element": q_elem.localname,
                "line": elem.sourceline or "",
                "status": "PASS",
                "value": elem_value,
                "message": ""
            })
        else:
            failed += 1
            results.append({
                "element": q_elem.localname,
                "line": elem.sourceline or "",
                "status": "FAIL",
                "value": elem_value,
                "message": f"Element '{q_elem.localname}' not found in schema namespace '{schema_ns}'"
            })

    # --- Summary row ---
    percent_valid = round((passed / total) * 100, 2) if total else 0.0
    results.append({})
    results.append({
        "element": "SUMMARY",
        "line": "",
        "status": f"{passed}/{total} Passed",
        "value": "",
        "message": f"{percent_valid}% Valid ({failed} Failed)"
    })

    # --- Generate CSV output ---
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["element", "line", "status", "value", "message"])
    writer.writeheader()
    for row in results:
        writer.writerow(row)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=validation-report.csv"}
    )
