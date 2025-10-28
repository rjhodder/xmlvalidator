# XML Validator

This is a web-based tool to validate XML files against XSD schemas. It provides a user-friendly interface with side-by-side editors, real-time validation with error highlighting, and the ability to download a detailed validation report in CSV format.

## Features

- **Side-by-Side Editors**: Monaco Editor for both XML and XSD content with syntax highlighting.
- **Multiple Input Methods**:
    - Paste or type directly into the editors.
    - Drag and drop XML and XSD files.
    - Upload files using dedicated buttons.
- **Inline Error Highlighting**: Invalid lines in the XML are highlighted directly in the editor.
- **Validation Results**: Clear pass/fail status with a validation score and a list of errors.
- **CSV Report Generation**: Download a detailed, element-by-element validation report in CSV format for analysis.
- **Resizable Layout**: Adjust the size of the XML and XSD editor panels.

## Technologies Used

### Backend
- [FastAPI](https://fastapi.tiangolo.com/)
- [lxml](https://lxml.de/)
- [uvicorn](https://www.uvicorn.org/)

### Frontend
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [react-reflex](https://github.com/leefsmp/react-reflex)

## Getting Started

### Prerequisites

- Python 3.6+ and `pip`
- Node.js and `npm`

### 1. Setup the Backend

```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn main:app --reload --port 8000
```
The backend will be running at `http://localhost:8000`.

### 2. Setup the Frontend

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Run the frontend development server
npm run dev
```
The frontend will be running at `http://localhost:5173` (or another port if 5173 is in use).

## Usage

1.  Open the frontend URL (e.g., `http://localhost:5173`) in your web browser.
2.  Provide the XML and XSD content using one of the following methods:
    - Copy and paste the content into the respective editors.
    - Drag and drop your `.xml` and `.xsd` files onto the page.
    - Click the "Upload XML" or "Upload XSD" buttons to select files from your computer.
3.  Click the **Validate** button to see the validation results and any inline error markers.
4.  Click the **Download CSV Report** button to get a detailed report of the validation.
