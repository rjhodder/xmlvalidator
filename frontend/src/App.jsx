import React, { useState, useRef } from "react";
import Editor from "@monaco-editor/react";

export default function App() {
  const [xml, setXml] = useState("");
  const [xsd, setXsd] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const xmlEditorRef = useRef(null);

  // Validate XML against XSD
  const handleValidate = async () => {
    if (!xml || !xsd) {
      alert("Please provide both XML and XSD.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("xml", new Blob([xml], { type: "text/xml" }), "file.xml");
      formData.append("xsd", new Blob([xsd], { type: "text/xml" }), "file.xsd");

      const res = await fetch("http://localhost:8000/validate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);

      // Highlight errors in the XML editor
      if (xmlEditorRef.current) {
        const monaco = await import("monaco-editor");
        const markers = [];
        if (data.status === "FAIL") {
          for (const err of data.errors) {
            const match = err.match(/:(\d+):\d*:/);
            if (match) {
              const line = parseInt(match[1]);
              markers.push({
                startLineNumber: line,
                endLineNumber: line,
                startColumn: 1,
                endColumn: 200,
                message: err,
                severity: monaco.MarkerSeverity.Error,
              });
            }
          }
        }
        monaco.editor.setModelMarkers(
          xmlEditorRef.current.getModel(),
          "validation",
          markers
        );
      }
    } catch (e) {
      alert("Validation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag-and-drop for both XML and XSD
  const handleDrop = async (event) => {
    event.preventDefault();
    setDragging(false);

    const files = Array.from(event.dataTransfer.files);
    for (const file of files) {
      const text = await file.text();
      const name = file.name.toLowerCase();
      if (name.endsWith(".xml")) {
        setXml(text);
      } else if (name.endsWith(".xsd")) {
        setXsd(text);
      } else {
        alert(`Unsupported file type: ${file.name}`);
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-6 space-y-6"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <h1 className="text-2xl font-semibold">XML & XSD Validator</h1>

      {dragging && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center text-2xl font-bold text-white z-50">
          Drop XML/XSD file(s) anywhere
        </div>
      )}

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 font-semibold">XML</label>
          <Editor
            height="400px"
            defaultLanguage="xml"
            theme="vs-dark"
            value={xml}
            onChange={(value) => setXml(value || "")}
            onMount={(editor) => (xmlEditorRef.current = editor)}
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">XSD</label>
          <Editor
            height="400px"
            defaultLanguage="xml"
            theme="vs-dark"
            value={xsd}
            onChange={(value) => setXsd(value || "")}
          />
        </div>
      </div>

      <button
        onClick={handleValidate}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-semibold disabled:opacity-50"
      >
        {loading ? "Validating..." : "Validate"}
      </button>

      {result && (
        <div
          className={`w-full max-w-4xl p-4 rounded ${
            result.status === "PASS" ? "bg-green-800" : "bg-red-800"
          }`}
        >
          <h2 className="font-bold mb-2">
            {result.status === "PASS" ? "✅ XML is valid!" : "❌ Validation failed"}
          </h2>
          {result.errors.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
