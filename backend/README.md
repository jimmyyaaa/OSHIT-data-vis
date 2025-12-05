# OSHIT Data Backend API

This is the backend API for the OSHIT Data Visualization project, migrated to a separate backend service.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON=<your_service_account_json_as_string>
   OPERATIONAL_SHEET_ID=<your_operational_sheet_id>
   DEFI_SHEET_ID=<your_defi_sheet_id>
   GOOGLE_GENAI_API_KEY=<your_google_genai_api_key>
   ```

   The `GOOGLE_SERVICE_ACCOUNT_JSON` should be the JSON content of your Google service account key as a single-line string.
   The `GOOGLE_GENAI_API_KEY` is your Google AI Studio API key for AI summary generation.

## Running the Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Endpoints

### GET /api/data

Returns all Google Sheets data in JSON format.

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "TS_Log": [
      {"column1": "value1", "column2": "value2", ...},
      ...
    ],
    "POS_Log": [...],
    ...
  }
}
```

### POST /api/ai/summary

Generates AI summary for provided data context using Google GenAI.

**Request Body:**
```json
{
  "data_context": "string with data to analyze",
  "system_instruction": "instruction for the AI model"
}
```

**Response Format (Success):**
```json
{
  "status": "success",
  "summary": "Generated AI summary text"
}
```

**Response Format (Error):**
```json
{
  "status": "error",
  "message": "Error description"
}
```

On error:
```json
{
  "status": "error",
  "message": "Error description"
}
```

## Frontend Integration

Frontend can request data using:

```javascript
// Get sheet data
fetch('http://localhost:8000/api/data')
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      // Use data.data which is an object with sheet names as keys
      console.log(data.data.TS_Log);
    } else {
      console.error(data.message);
    }
  });

// Generate AI summary
fetch('http://localhost:8000/api/ai/summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data_context: 'Your data context here',
    system_instruction: 'Your system instruction here'
  })
})
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      console.log(data.summary);
    } else {
      console.error(data.message);
    }
  });
```

## CORS

CORS is enabled to allow requests from any origin. In production, configure specific origins.