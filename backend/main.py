from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from lxml import etree

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/validate")
async def validate_endpoint(xml: UploadFile, xsd: UploadFile):
    try:
        xml_doc = etree.parse(xml.file)
        xsd_doc = etree.parse(xsd.file)
        schema = etree.XMLSchema(xsd_doc)

        if schema.validate(xml_doc):
            return {"status": "PASS", "errors": []}
        else:
            errors = [str(e) for e in schema.error_log]
            return {"status": "FAIL", "errors": errors}

    except Exception as e:
        return {"status": "ERROR", "errors": [str(e)]}
