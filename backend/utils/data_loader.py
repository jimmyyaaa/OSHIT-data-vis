import json
import gspread
import pandas as pd
import logging
from google.oauth2.service_account import Credentials
import os

logger = logging.getLogger(__name__)

def load_sheet_data(sheet_names):
    """
    Open Google Sheet by SHEET_ID and load sheets listed in sheet_names.
    Returns a dictionary of DataFrames keyed by sheet name.
    """

    SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

    # Load service account from file (environment variables already loaded in main.py)
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
    creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    gc = gspread.authorize(creds)

    OPERATIONAL_SHEET_ID = os.getenv("OPERATIONAL_SHEET_ID")
    if not OPERATIONAL_SHEET_ID:
        raise ValueError("OPERATIONAL_SHEET_ID environment variable must be set")

    op_sh = gc.open_by_key(OPERATIONAL_SHEET_ID)

    result = {}
    for sheet_name in sheet_names:
        # 所有保留的表格目前都从 operational sheet 加载
        ws = op_sh.worksheet(sheet_name)

        records = ws.get_all_records()
        df = pd.DataFrame(records)
        # 转换日期列
        if 'Timestamp(UTC+8)' in df.columns:
            df['Timestamp(UTC+8)'] = pd.to_datetime(df['Timestamp(UTC+8)'])

        result[sheet_name] = df
        logger.info(f"Loaded sheet: {sheet_name} from operational sheet")

    return result
