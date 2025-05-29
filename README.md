# 智慧農業平台 - 牡蠣肉重預測系統

本專案是一個基於 Web 的應用程式，旨在利用機器學習模型預測牡蠣的肉重，以輔助智慧農業的決策，提升養殖效率與品質管控。

## 主要功能

*   **使用者認證**: 安全的註冊與登入系統。
*   **牡蠣數據輸入**: 使用者可以輸入牡蠣的各項生物特徵，如左殼長、殼寬、殼高等。
*   **模型選擇**: 支援選擇不同的預測模型（例如 CNN 模型、模擬模型）進行分析。
*   **肉重預測**: 根據輸入的數據和選擇的模型，預測牡蠣的肉重。
*   **歷史記錄管理**:
    *   自動儲存每一次的預測結果。
    *   使用者可以查看、編輯（透過彈窗）及刪除歷史預測記錄。
*   **響應式設計**: 採用 Tailwind CSS，確保在不同裝置上（桌面、平板、手機）均有良好的使用體驗。
*   **動態互動**: 使用 JavaScript 實現前端的動態效果，如彈窗、圖片預覽等。

## 技術棧

*   **後端**:
    *   Python
    *   Flask (網頁框架)
    *   SQLAlchemy (ORM，用於資料庫操作)
    *   Gunicorn (WSGI HTTP 伺服器，用於生產環境部署)
*   **前端**:
    *   HTML5
    *   Tailwind CSS (CSS 框架)
    *   JavaScript
*   **資料庫**:
    *   SQLite (開發與輕量級部署)
*   **版本控制**:
    *   Git & GitHub

## 專案設定與安裝

1.  **複製儲存庫** (假設您已將專案推送到 GitHub):
    ```bash
    git clone https://github.com/YOUR_USERNAME/oyster-predictor.git
    cd oyster-predictor
    ```

2.  **建立並啟用 Python 虛擬環境**:
    ```bash
    python3 -m venv oysenv
    source oysenv/bin/activate
    ```
    (Windows 使用: `oysenv\\Scripts\\activate`)

3.  **安裝依賴套件**:
    在啟用虛擬環境後，使用以下指令安裝所需的套件：
    ```bash
    pip3 install -r requirements.txt
    ```

4.  **初始化資料庫**:
    應用程式在首次執行時，如果 `instance/oyster_predictor.db` 不存在，Flask SQLAlchemy 會自動根據 `app.py` 中定義的模型建立資料庫和相關的表。或者，您可以透過 Flask Shell 手動建立：
    ```python
    from app import app, db
    with app.app_context():
        db.create_all()
    ```

## 如何執行

### 開發模式

您可以直接執行 `app.py`。由於 `app.py` 檔案末尾包含了 Gunicorn 的啟動邏輯，在開發時，您可能需要註解掉該部分，或者直接使用 Flask 內建的開發伺服器：

```bash
flask run
```
或者 (如果 `app.py` 中沒有 `if __name__ == '__main__': app.run(debug=True)`):
```bash
python app.py
```
(請確保在 `app.py` 中有類似 `app.run(debug=True)` 的程式碼，並且 Gunicorn 啟動部分被條件化或註解掉，以便在開發時使用 Flask 開發伺服器。)

### 生產模式 (使用 Gunicorn)

`app.py` 檔案中已包含使用 `subprocess` 啟動 Gunicorn 的邏輯。或者，您可以直接在終端機中執行：

```bash
gunicorn --workers 4 --bind 0.0.0.0:8000 app:app
```

## 專案結構

```
oyster-predictor/
├── app.py              # Flask 應用程式主要邏輯
├── requirements.txt    # Python 依賴套件
├── .gitignore          # 指定 Git 忽略的檔案
├── README.md           # 專案說明檔案
├── instance/           # 資料庫等實例特定檔案
│   └── oyster_predictor.db # SQLite 資料庫檔案 (執行後產生)
├── oysenv/             # Python 虛擬環境資料夾 (本地設定)
├── static/             # 靜態檔案 (CSS, JavaScript, 圖片)
│   ├── css/
│   │   └── style.css   # 主要樣式檔案
│   └── js/
│       └── script.js   # 主要 JavaScript 檔案 (目前為空，可擴展)
└── templates/          # HTML 模板檔案
    ├── auth.html       # 認證頁面 (登入/註冊)
    ├── footer.html     # 頁腳共用元件
    ├── header.html     # 頁首共用元件
    ├── home.html       # 首頁
    └── oyster_predictor.html # 牡蠣預測功能頁面
```

## 未來可能的增強功能

*   整合更複雜的機器學習/深度學習模型。
*   支援牡蠣圖像上傳，並整合到 CNN 模型預測流程中。
*   提供更進階的數據分析與視覺化圖表。
*   使用者角色與權限管理。
*   部署到雲端平台。
