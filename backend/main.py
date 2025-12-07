from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from dotenv import load_dotenv
import pandas as pd
from data_loader import load_sheet_data
from ai_helper import get_ai_summary

app = FastAPI(
    title="OSHIT Data API", 
    version="1.0.0",
    description="API for OSHIT data visualization",
)

# Load environment-specific .env file
environment = os.getenv("ENVIRONMENT", "local")
if environment == "production":
    load_dotenv(".env.production")
elif environment == "local":
    load_dotenv(".env.local")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Specify allowed methods
    allow_headers=["*"],
)

@app.get("/getDataFromSheets")
async def get_data():
    """
    Returns all sheet data as JSON.
    """
    try:
        sheet_names = ["TS_Log", "POS_Log", "Staking_Log", "Staking_Amount_Log", "ShitCode_Log", "TS_Discord", "SHIT_Price_Log", "Liq_Pool_Activity"]
        data = load_sheet_data(sheet_names)
        # Convert DataFrames to dict for JSON serialization
        result = {}
        for sheet_name, df in data.items():
            # Convert datetime columns to string
            df_copy = df.copy()
            for col in df_copy.columns:
                if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
                    df_copy[col] = df_copy[col].astype(str)
            result[sheet_name] = df_copy.to_dict('records')
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/getAISummary")
async def generate_ai_summary(request: dict):
    """
    Generate AI summary for provided data context.

    Expected request body:
    {
        "data_context": "string with data to analyze",
        "system_instruction": "instruction for the AI model"
    }
    """
    try:
        data_context = request.get("data_context", "")
        system_instruction = request.get("system_instruction", "")

        if not data_context:
            return {"status": "error", "message": "data_context is required"}

        if not system_instruction:
            return {"status": "error", "message": "system_instruction is required"}

        summary = await get_ai_summary(data_context, system_instruction)

        if summary.startswith("Error"):
            return {"status": "error", "message": summary}
        else:
            return {"status": "success", "summary": summary}

    except Exception as e:
        return {"status": "error", "message": f"Failed to generate AI summary: {str(e)}"}