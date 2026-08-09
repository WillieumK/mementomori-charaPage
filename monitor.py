import os
import json
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime

# Google Sheets 授权
creds_json = json.loads(os.environ['GOOGLE_SHEETS_CREDENTIALS'])
creds = Credentials.from_service_account_info(
    creds_json,
    scopes=[
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly"
    ]
)
client = gspread.authorize(creds)

# 表格 ID
USAGE_SHEET_ID = "1VrnhPswVqPPbbC-Gps_e9Um7tWUyIg4Bl66HMt_O8Zw"
CARD_SHEET_ID = "1zfViKEEZCK1fdozmX_i1Udtc115QxeWP3lzaf3vrvYA"

def get_range(sheet_id, range_str):
    sheet = client.open_by_key(sheet_id).sheet1
    return sheet.get(range_str)

def main():
    print("📊 开始读取 Google Sheets 数据...")

    print("读取巅峰自动 A1:K7...")
    usage_data = get_range(USAGE_SHEET_ID, "A1:K7")
    print(f"✅ 巅峰自动读取成功，{len(usage_data)} 行")

    print("读取 mmt#卡3 B1:K16...")
    card_data = get_range(CARD_SHEET_ID, "B1:K16")
    print(f"✅ mmt#卡3读取成功，{len(card_data)} 行")

    html_content = generate_html(usage_data, card_data)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html_content)

    print("🎉 网页已生成: index.html")

def generate_html(usage_data, card_data):
    html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MementoMori 数据监测</title>
<style>
body {
    font-family: Arial, sans-serif;
    background:#f5f5f5;
    padding:20px;
    max-width:1400px;
    margin:auto;
}
h1 {
    color:#333;
}
.container {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
}
.card {
    background:white;
    border-radius:12px;
    padding:20px;
}
table {
    border-collapse:collapse;
    width:100%;
}
th,td {
    border:1px solid #ddd;
    padding:8px;
}
th {
    background:#4CAF50;
    color:white;
}
.timestamp {
    margin-top:20px;
    text-align:right;
    color:#888;
}
</style>
</head>
<body>
<h1>📊 MementoMori 数据监测</h1>
<div class="container">
<div class="card">
<h2>📈 巅峰自动（使用率）</h2>
<table>
"""

    if usage_data:
        html += "<thead><tr>"
        for cell in usage_data[0]:
            html += f"<th>{cell}</th>"
        html += "</tr></thead><tbody>"

        for row in usage_data[1:]:
            html += "<tr>"
            for cell in row:
                html += f"<td>{cell}</td>"
            html += "</tr>"

        html += "</tbody>"

    html += """
</table>
</div>
<div class="card">
<h2>🎴 卡池表</h2>
<table>
"""

    if card_data:
        html += "<thead><tr>"
        for cell in card_data[0]:
            html += f"<th>{cell}</th>"
        html += "</tr></thead><tbody>"

        for row in card_data[1:]:
            html += "<tr>"
            for cell in row:
                html += f"<td>{cell}</td>"
            html += "</tr>"

        html += "</tbody>"

    html += f"""
</table>
</div>
</div>
<div class="timestamp">
更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
</div>
</body>
</html>
"""
    return html

if __name__ == "__main__":
    main()
