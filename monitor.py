import os
import json
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageDraw, ImageFont

# Google Sheets授权
creds_json=json.loads(os.environ["GOOGLE_SHEETS_CREDENTIALS"])
creds=Credentials.from_service_account_info(
    creds_json,
    scopes=[
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly"
    ]
)
client=gspread.authorize(creds)

# Sheet ID
USAGE_SHEET_ID="1VrnhPswVqPPbbC-Gps_e9Um7tWulYg4BI66HMt_OBZw"
CARD_SHEET_ID="1zfViKEEZCk1fdozmX_i1Udtc115QxeWP3lzaf3vrvYA"

def get_range(sheet_id,range_str):
    sheet=client.open_by_key(sheet_id).sheet1
    return sheet.get(range_str)

def create_table_image(data,filename):
    os.makedirs("assets",exist_ok=True)
    try:
        font=ImageFont.truetype("NotoSansCJK-Regular.ttc",28)
    except:
        font=ImageFont.load_default()

    if filename=="usage.png":
        w,h=1150,690
    else:
        w,h=900,610

    img=Image.new("RGB",(w,h),"white")
    draw=ImageDraw.Draw(img)

    rows=len(data)
    cols=max(len(row) for row in data)
    cw=w//cols
    rh=h//rows

    for y,row in enumerate(data):
        for x,value in enumerate(row):
            draw.rectangle(
                [x*cw,y*rh,(x+1)*cw,(y+1)*rh],
                outline="black"
            )
            draw.text(
                (x*cw+10,y*rh+10),
                str(value),
                font=font,
                fill="black"
            )

    img.save(
        f"assets/{filename}",
        dpi=(300,300)
    )
    print(f"生成图片:{filename} {w}x{h}")

def table_html(data):
    html="<table><thead><tr>"
    for cell in data[0]:
        html+=f"<th>{cell}</th>"
    html+="</tr></thead><tbody>"

    for row in data[1:]:
        html+="<tr>"
        for cell in row:
            html+=f"<td>{cell}</td>"
        html+="</tr>"

    html+="</tbody></table>"
    return html

def generate_html(usage_data,card_data):
    bj=datetime.now(timezone.utc)+timedelta(hours=8)
    update=bj.strftime("%Y-%m-%d %H:%M:%S")

    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>📊 MementoMori 数据监测</title>
<style>
body{{
font-family:Arial,"Microsoft YaHei";
padding:20px;
}}
table{{
border-collapse:collapse;
margin-bottom:30px;
}}
th,td{{
border:1px solid #999;
padding:8px;
white-space:nowrap;
}}
th{{
background:#eee;
}}
.imgbox{{
overflow-x:auto;
}}
.imgbox img{{
width:auto;
height:auto;
}}
</style>
</head>
<body>
<h1>📊 MementoMori 数据监测</h1>
<p>更新时间：{update}（北京时间）</p>

<h2>巅峰自动图片</h2>
<div class="imgbox">
<img src="assets/usage.png">
</div>

<h2>MMT卡池图片</h2>
<div class="imgbox">
<img src="assets/card.png">
</div>

<h2>巅峰自动数据</h2>
{table_html(usage_data)}

<h2>MMT卡池数据</h2>
{table_html(card_data)}

</body>
</html>
"""

def main():
    print("读取Google Sheets...")

    usage_data=get_range(
        USAGE_SHEET_ID,
        "A1:K7"
    )

    card_data=get_range(
        CARD_SHEET_ID,
        "B1:K16"
    )

    print("生成图片...")

    create_table_image(
        usage_data,
        "usage.png"
    )

    create_table_image(
        card_data,
        "card.png"
    )

    html=generate_html(
        usage_data,
        card_data
    )

    with open(
        "index.html",
        "w",
        encoding="utf-8"
    ) as f:
        f.write(html)

    print("完成")

if __name__=="__main__":
    main()
