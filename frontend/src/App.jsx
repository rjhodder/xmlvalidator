import React, { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { ReflexContainer, ReflexSplitter, ReflexElement } from "react-reflex";
import "./App.css";
import "react-reflex/styles.css";

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

  const getPanelColorClass = (score) => {
    if (score >= 90) return "result-panel--pass";
    if (score >= 50) return "result-panel--warn";
    return "result-panel--fail";
  };

  const getPanelIcon = (score) => {
    if (score >= 90) return "✅";
    if (score >= 50) return "⚠️";
    return "❌";
  };

  return (
    <div
      className="app-container"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <h1>XML & XSD Validator</h1>

      {dragging && (
        <div className="dragging-overlay">
          Drop XML/XSD file(s) anywhere
        </div>
      )}

      <div className="editors-container">
        <ReflexContainer orientation="vertical">
          <ReflexElement className="editor-wrapper" flex={0.5}>
            <label>XML</label>
            <Editor
              defaultLanguage="xml"
              theme="vs-dark"
              value={xml}
              onChange={(value) => setXml(value || "")}
              onMount={(editor) => (xmlEditorRef.current = editor)}
            />
          </ReflexElement>

          <ReflexSplitter />

          <ReflexElement className="editor-wrapper" flex={0.5}>
            <label>XSD</label>
            <Editor
              defaultLanguage="xml"
              theme="vs-dark"
              value={xsd}
              onChange={(value) => setXsd(value || "")}
            />
          </ReflexElement>
        </ReflexContainer>
      </div>

      <div className="button-container">
        <button
          onClick={handleValidate}
          disabled={loading}
          className="button validate-button"
        >
          {loading ? "Validating..." : "Validate"}
        </button>
        <button
          onClick={downloadCSVReport}
          className="button report-button"
        >
          Download CSV Report
        </button>
      </div>

      {result && (
        <div
          className={`result-panel ${getPanelColorClass(result.score)}`}
        >
          <h2>
            {getPanelIcon(result.score)}{" "}
            {result.score >= 90 ? "XML is valid!" :
             result.score >= 50 ? "Some issues detected" :
             "Validation failed"}
          </h2>
          <p>Score: {result.score} / 100</p>
          {result.errors && result.errors.length > 0 && (
            <ul>
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
