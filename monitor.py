import os
import json
import gspread
from google.oauth2.service_account import Credentials

# 从环境变量读取密钥
creds_json = json.loads(os.environ['GOOGLE_SHEETS_CREDENTIALS'])
creds = Credentials.from_service_account_info(creds_json)
client = gspread.authorize(creds)

# 表格 ID
USAGE_SHEET_ID = "1VrnhPswVqPPbbC-Gps_e9Um7tWUyIg4Bl66HMt_O8Zw"  # 巅峰自动
CARD_SHEET_ID = "1zfViKEEZCK1fdozmX_i1Udtc115QxeWP3lzaf3vrvYA"   # mmt#卡3

def get_range(sheet_id, range_str):
    """读取指定表格的指定范围"""
    sheet = client.open_by_key(sheet_id).sheet1
    data = sheet.get(range_str)
    return data

def main():
    print("📊 开始读取 Google Sheets 数据...")
    
    # 读取巅峰自动 A1:K7
    print("读取巅峰自动 A1:K7...")
    usage_data = get_range(USAGE_SHEET_ID, "A1:K7")
    print(f"✅ 巅峰自动读取成功，{len(usage_data)} 行")
    
    # 读取 mmt#卡3 B1:K16
    print("读取 mmt#卡3 B1:K16...")
    card_data = get_range(CARD_SHEET_ID, "B1:K16")
    print(f"✅ mmt#卡3 读取成功，{len(card_data)} 行")
    
    # 生成 HTML 网页
    html_content = generate_html(usage_data, card_data)
    
    # 保存为 HTML 文件
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print("🎉 网页已生成: index.html")

def generate_html(usage_data, card_data):
    """生成 HTML 网页"""
    html = '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MementoMori 数据监测</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
            overflow-x: auto;
        }
        .card h2 {
            margin-top: 0;
            color: #555;
            font-size: 18px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            font-size: 14px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
            white-space: nowrap;
        }
        th {
            background: #4CAF50;
            color: white;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        tr:hover {
            background: #f1f1f1;
        }
        .timestamp {
            color: #888;
            font-size: 14px;
            margin-top: 20px;
            text-align: right;
        }
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <h1>📊 MementoMori 数据监测</h1>
    <div class="container">
        <div class="card">
            <h2>📈 巅峰自动（使用率）</h2>
            <table>
'''
    
    # 巅峰自动表格
    if usage_data:
        # 表头
        html += "                <thead><tr>"
        for cell in usage_data[0]:
            html += f"<th>{cell}</th>"
        html += "</tr></thead>\n"
        # 数据行
        html += "                <tbody>\n"
        for row in usage_data[1:]:
            html += "                    <tr>"
            for cell in row:
                html += f"<td>{cell}</td>"
            html += "</tr>\n"
        html += "                </tbody>\n"
    
    html += '''
            </table>
        </div>
        <div class="card">
            <h2>🎴 卡池表</h2>
            <table>
'''
    
    # 卡池表
    if card_data:
        html += "                <thead><tr>"
        for cell in card_data[0]:
            html += f"<th>{cell}</th>"
        html += "</tr></thead>\n"
        html += "                <tbody>\n"
        for row in card_data[1:]:
            html += "                    <tr>"
            for cell in row:
                html += f"<td>{cell}</td>"
            html += "</tr>\n"
        html += "                </tbody>\n"
    
    html += '''
            </table>
        </div>
    </div>
    <div class="timestamp">
        更新时间: ''' + __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '''
    </div>
</body>
</html>
'''
    return html

if __name__ == "__main__":
    main()
