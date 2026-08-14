# CONTEXT.md — 領域詞彙（Domain Model）

> 由 /hound 四門檻門檻一（Spec）產出，累積式文件——每次獵犬模式任務喺呢度 append 新詞彙，唔覆蓋舊記錄。

## 2026-08-14：百科生態系 SEO/AEO/GEO 標準模版審計

| 詞 | 具體指乜 | 權威定義喺邊 | 唔等於 |
|---|---|---|---|
| **標準模版（Standard Template）** | 一份規格文件（非代碼），定義6個百科生態系站點（world/japan/hongkong/taiwan/malaysia-encyclopedia + cloudpipe-macao-app）嘅SEO/AEO/GEO結構化元素基線 | `~/Documents/KiraVault/Projects/CloudPipe-AEO/SPEC-encyclopedia-seo-aeo-geo-template-2026-08-14.md` | 「已落地嘅生成代碼」——2026-08-14呢次任務只產出規格，冇改任何站嘅生產代碼 |
| **AEO_REQUIRED_ELEMENTS** | `ecosystem_config.py` 現行12項驗證規則常數（canonical/robots_meta/llms_txt_link/og:*/article_schema/faq_schema/organization_schema/breadcrumb_schema/cc_by_4） | `~/.openclaw/workspace/scripts/ecosystem_config.py` | 直接改咗嗰個py檔本身——2026-08-14嗰份spec只提出修正版建議（如article_schema要容許ScholarlyArticle），未落實去改原檔 |
| **百科衛星站（Encyclopedia Satellite Site）** | world/japan/hongkong/taiwan/malaysia-encyclopedia 五個獨立repo/Vercel部署 | `ecosystem_config.py` 的 `ECOSYSTEM_LINKS_RAW`（`type="knowledge"`） | cloudpipemo.com主站（`type="platform"`，功能相關但唔屬呢個分類） |

詳細審計發現見 `~/.openclaw/api-cache/project_maps/encyclopedia.md`（持久架構圖，歷史區有07-31起完整記錄）。
