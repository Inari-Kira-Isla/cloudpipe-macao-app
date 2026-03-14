# CloudPipe 澳門商戶 AI 百科

**Live**: [cloudpipe-macao-app.vercel.app](https://cloudpipe-macao-app.vercel.app)

澳門首個 AI 自動生成的三語商戶百科平台，涵蓋 940+ 商戶、20 個行業分類。

## 數據統計

| 指標 | 數量 |
|------|------|
| 上線商戶 | 940+ |
| 中文內容 | 822 |
| 英文內容 | 815 |
| 葡文內容 | 799 |
| 行業大類 | 6 (餐飲/食品供應/酒店/生活/服務/旅遊) |
| 行業子類 | 20 |

## 技術架構

- **框架**: Next.js 16 + TypeScript + Tailwind CSS
- **資料庫**: Supabase (PostgreSQL)
- **部署**: Vercel (App Router + SSR)
- **內容生成**: Claude Sonnet AI + 澳門事實檢查系統
- **AEO**: Schema.org JSON-LD, llms.txt, sitemap.xml, robots.txt AI 友善

## 路由結構

```
/macao                          → 行業總覽
/macao/[industry]               → 行業頁
/macao/[industry]/[category]    → 分類頁
/macao/[industry]/[category]/[slug] → 商戶詳情頁
```

## Open API

```
GET /api/v1/merchants?industry=dining&category=cafe&lang=zh
```

- CORS 開放
- CC BY 4.0 授權
- 支援 `industry`, `category`, `lang`, `limit`, `offset` 參數

## 相關連結

- [CloudPipe 平台](https://cloudpipe-landing.vercel.app) — AI 自動化主站
- [CloudPipe 全球企業目錄](https://cloudpipe-directory.vercel.app) — 185 萬筆亞太企業資料
- [AI 學習寶庫](https://inari-kira-isla.github.io/Openclaw/) — AI 提示詞與教學
- [世界百科](https://world-encyclopedia.vercel.app) — 多語言百科平台

## License

CC BY 4.0
