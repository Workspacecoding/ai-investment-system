# External Free API Resources

本文件整理「股票數據分析專案」第一階段會使用的免費或公開資料來源。所有資源皆先以資料取得、指標計算與通知為主，不包含付費行情、券商下單、AI 文案或圖表服務。

> 注意：免費限制與服務條款可能變動，上線前需再次確認各服務官方文件與使用條款。

| API / 工具 | 使用目的 | 是否需要 API Key | 免費限制 | 預計使用資料 | 對應系統模組 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| Yahoo Finance via `yfinance` | 歷史股價、ETF、匯率資料 | 否 | 非官方 Yahoo API wrapper，適合研究與個人用途；需遵守 Yahoo Finance 使用條款 | OHLCV、調整收盤價、台股代號如 `2330.TW`、匯率如 `USDTWD=X` | Watchlist Sync、Asset Prices、Indicator / Factor Pool、Market Module | `yfinance` 官方 PyPI 說明指出其使用 Yahoo 公開資料且非 Yahoo 官方背書；正式商用需評估授權 |
| TWSE OpenAPI / 公開 JSON | 台股每日交易資料 | 否 | 公開資料，仍需注意 TWSE 使用規範與請求頻率 | 個股每日成交資訊、開高低收、成交量 | Stock Universe、Asset Prices、Watchlist Sync | 初版使用 `STOCK_DAY` JSON endpoint，保留未來改接 OpenAPI 的結構 |
| FinMind | 台股財報、月營收、基本面資料 | 部分資料可免 token；建議使用 token | 免費方案有 API 使用次數限制，需以 FinMind 最新政策為準 | 財務報表、月營收、台股基本面資料 | Fundamental Module、Factor Pool、Backtesting | 使用 `FINMIND_API_TOKEN`，先以 requests 串 `/api/v4/data` |
| Yahoo Finance via `yfinance` | 匯率資料 | 否 | 同 Yahoo Finance 限制 | `USDTWD=X`、其他匯率 pair | Market Module、Portfolio、Performance Reports | 與歷史股價共用 `yahoo_finance_client.py` |
| FRED API | 美國公債與利率資料 | 是，`FRED_API_KEY` | 免費但需要 API key；需遵守 FRED API 使用條款與頻率限制 | 美國 10 年期公債殖利率 `DGS10`、Federal Funds Rate `FEDFUNDS` | Market Module、Scoring Engine、Macro Signals | 使用 FRED `series/observations` endpoint；若未設定 key，回傳空 DataFrame |
| `ta` Python 套件 | 技術指標計算 | 否 | 開源套件，無 API rate limit | MA5、MA20、MA60、RSI、MACD | Indicator / Factor Pool、Swing Trading Engine、Trade Plan Engine | 以 pandas DataFrame 為輸入，回傳新增技術指標欄位 |
| Google News RSS + `feedparser` | 新聞資料 | 否 | RSS 公開查詢，需避免高頻請求；非完整新聞 API | 標題、連結、來源、發布時間、摘要 | News / Sentiment Module、Notification Engine | 使用 `https://news.google.com/rss/search?q=...`，初版不做 NLP / AI |
| Gmail SMTP | Email 通知 | 需要 Gmail 帳號與 App Password | Gmail 寄信限制依 Google 帳號/Workspace 政策而定 | Email subject、body、receiver | Notification Engine、Weekly / Monthly Reports | 使用 `smtp.gmail.com:465` SSL；測試程式預設註解寄信，避免誤寄 |

## 參考連結

- yfinance PyPI: https://pypi.org/project/yfinance/
- TWSE Open Data: https://www.twse.com.tw/en/page/open_data.html
- FinMind Docs: https://finmind.github.io/
- FRED API: https://fred.stlouisfed.org/docs/api/fred/
- `ta` docs: https://technical-analysis-library-in-python.readthedocs.io/en/latest/
- feedparser docs: https://feedparser.readthedocs.io/en/latest/
- Gmail email client setup: https://support.google.com/mail/answer/7126229
