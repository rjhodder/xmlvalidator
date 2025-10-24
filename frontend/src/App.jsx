import React, { useState, useRef } from "react";
import Editor from "@monaco-editor/react";

export default function App() {
  const [xml, setXml] = useState("");
  const [xsd, setXsd] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const xmlEditorRef = useRef(null);

  // Validate XML for inline markers
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

      const score =
        data.status === "PASS"
          ? 100
          : Math.max(0, 100 - (data.errors ? data.errors.length * 10 : 0));

      setResult({ ...data, score });

      // Monaco inline markers
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

  // Drag-and-drop XML/XSD
  const handleDrop = async (event) => {
    event.preventDefault();
    setDragging(false);

    const files = Array.from(event.dataTransfer.files);
    for (const file of files) {
      const text = await file.text();
      const name = file.name.toLowerCase();
      if (name.endsWith(".xml")) setXml(text);
      else if (name.endsWith(".xsd")) setXsd(text);
      else alert(`Unsupported file type: ${file.name}`);
    }
  };

  // Download CSV report
  const downloadCSVReport = async () => {
    const formData = new FormData();
    formData.append("xml", new Blob([xml], { type: "text/xml" }), "file.xml");
    formData.append("xsd", new Blob([xsd], { type: "text/xml" }), "file.xsd");

    const res = await fetch("http://localhost:8000/validate_csv", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      alert("CSV generation failed");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "validation-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPanelColor = (score) => {
    if (score >= 90) return "bg-green-600 border-green-400";
    if (score >= 50) return "bg-yellow-600 border-yellow-400";
    return "bg-red-600 border-red-400";
  };

  const getPanelIcon = (score) => {
    if (score >= 90) return "✅";
    if (score >= 50) return "⚠️";
    return "❌";
  };

  return (
    <div
      className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-6 space-y-6"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
            width= "75%"
            defaultLanguage="xml"
            theme= "vs-dark"    
            value={xml}
            onChange={(value) => setXml(value || "")}
            onMount={(editor) => (xmlEditorRef.current = editor)}
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">XSD</label>
          <Editor
            height="400px"
            width="75%"
            defaultLanguage="xml"
            theme="vs-dark"
            value={xsd}
            onChange={(value) => setXsd(value || "")}
          />
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleValidate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Validating..." : "Validate"}
        </button>
        <button
          onClick={downloadCSVReport}
          className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded font-semibold"
        >
          Download CSV Report
        </button>
      </div>

      {result && (
        <div
          className={`w-full max-w-4xl p-4 rounded shadow-md border-2 text-white ${getPanelColor(result.score)}`}
        >
          <h2 className="font-bold mb-2">
            {getPanelIcon(result.score)}{" "}
            {result.score >= 90 ? "XML is valid!" :
             result.score >= 50 ? "Some issues detected" :
             "Validation failed"}
          </h2>
          <p className="font-semibold mb-2">Score: {result.score} / 100</p>
          {result.errors && result.errors.length > 0 && (
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
