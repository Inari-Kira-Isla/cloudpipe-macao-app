'use client'

const T = {
  bg: '#08111F', panel: '#0D1B2E', border: 'rgba(255,255,255,0.07)',
  gold: '#F5C842', muted: 'rgba(255,255,255,0.5)', text: 'rgba(255,255,255,0.9)',
  green: '#34D399', red: '#F87171', blue: '#60A5FA', purple: '#A78BFA',
}

const Section = ({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{title}</div>
    </div>
    {children}
  </div>
)

const Step = ({ num, title, desc, note }: { num: number; title: string; desc: string; note?: string }) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: T.gold, flexShrink: 0, fontSize: 14 }}>{num}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{desc}</div>
      {note && <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,200,66,0.06)', borderLeft: `3px solid ${T.gold}`, borderRadius: '0 8px 8px 0', fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{note}</div>}
    </div>
  </div>
)

const Tag = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}40`, color, fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 6 }}>{children}</span>
)

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, ...style }}>{children}</div>
)

export default function GuidePage() {
  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B2E 0%, #0a1628 100%)', borderBottom: `1px solid ${T.border}`, padding: '48px 40px 40px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 36 }}>🏢</span>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.gold }}>澳門地產盤源管理系統</div>
              <div style={{ fontSize: 14, color: T.muted, marginTop: 4 }}>使用說明 · CloudPipe Demo v1.0</div>
            </div>
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, maxWidth: 600 }}>
            一個專為澳門地產代理設計的私有雲端工具。<br />
            上傳截圖、對話記錄盤源、跟進客戶、整理睇樓資料，全部自動整理入庫。
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <Tag color={T.gold}>🤖 AI 自動提取</Tag>
            <Tag color={T.green}>☁️ 雲端儲存</Tag>
            <Tag color={T.blue}>📱 手機適用</Tag>
            <Tag color={T.purple}>🔒 私有數據</Tag>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>

        {/* 系統概覽 */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: T.gold }}>系統三大功能</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: '🏢', color: T.gold,   title: '盤源管理',  desc: '截圖上傳或對話輸入，AI 自動提取資料，整理成標準表格，一鍵匯出 CSV 或 WhatsApp 格式' },
              { icon: '👤', color: T.green,  title: '客戶跟進',  desc: '建立客戶資料庫，記錄預算、偏好地區、緊急程度，設定下次跟進日期，追蹤每個客戶狀態' },
              { icon: '📸', color: T.purple, title: '睇樓記錄',  desc: '記錄每次睇樓現場，上傳圖片由 AI 自動分類房間、偵測瑕疵，生成睇樓日誌' },
            ].map(item => (
              <Card key={item.title}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: item.color }}>{item.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>{item.desc}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* 盤源管理 */}
        <Section icon="🏢" title="盤源管理" color={T.gold}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 10px', background: 'rgba(245,200,66,0.12)', borderRadius: 8, fontSize: 13, color: T.gold }}>方法 A</span>
                截圖上傳
              </div>
              <Step num={1} title="進入「盤源管理」分頁" desc="點擊頂部「🏢 盤源管理」分頁" />
              <Step num={2} title="點擊「📸 截圖上傳」" desc="確認左側顯示截圖上傳介面" />
              <Step num={3} title="拖入截圖或點擊上傳" desc="支援中原地產、利嘉閣、美聯、MaliMali 的截圖，可同時上傳多張" />
              <Step num={4} title="AI 自動提取（5秒）" desc="系統自動識別地區、面積、叫價、呎價等 18 個欄位" note="💡 信心分數低（黃/紅色）的欄位，建議點擊手動確認" />
              <Step num={5} title="查看右側表格" desc="盤源已自動入庫，可點擊任一欄位直接修改" />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 10px', background: 'rgba(96,165,250,0.12)', borderRadius: 8, fontSize: 13, color: T.blue }}>方法 B</span>
                對話輸入
              </div>
              <Step num={1} title="點擊「💬 對話輸入」" desc="切換到 MiniMax AI 聊天介面" />
              <Step num={2} title="用廣東話描述樓盤" desc="例：「氹仔廣場附近，3房2廁，700呎，叫580萬，有車位」" />
              <Step num={3} title="AI 追問缺少資料" desc="如未填地區或面積，AI 會主動提問補充" />
              <Step num={4} title="確認後說「儲存」" desc="說「確認」、「儲存」、「OK」、「好了」即自動入庫" note="💡 按 Enter 發送，Shift+Enter 換行" />
              <Step num={5} title="切回盤源管理查看" desc="點擊頂部「🏢 盤源管理」查看新入庫的盤源" />
            </Card>
          </div>

          <Card>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>📊 表格操作說明</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              {[
                { icon: '✏️', label: '點擊欄位', desc: '直接編輯任何欄位（點擊大廈名稱即可修改）' },
                { icon: '📋', label: 'WhatsApp 複製', desc: '點擊 📋 按鈕，自動生成格式化 WhatsApp 盤源訊息' },
                { icon: '⬇', label: 'CSV 匯出', desc: '點擊右上角「⬇ CSV」，下載所有或已勾選的盤源為 Excel 格式' },
                { icon: '🗑', label: '刪除盤源', desc: '點擊 🗑 按鈕刪除單條記錄；「清除全部」清空所有盤源' },
                { icon: '☑', label: '批量勾選', desc: '勾選多條盤源後，可批量 CSV 匯出' },
                { icon: '🟢', label: '信心顏色', desc: '綠色 >80% / 黃色 50-80% / 紅色 <50%（AI 提取把握度）' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div><div style={{ fontWeight: 600, marginBottom: 2 }}>{item.label}</div><div style={{ color: T.muted, lineHeight: 1.5 }}>{item.desc}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* 客戶跟進 */}
        <Section icon="👤" title="客戶跟進" color={T.green}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>➕ 新增客戶</div>
              <Step num={1} title="點擊「👤 客戶跟進」分頁" desc="進入客戶管理介面" />
              <Step num={2} title="點擊右上角「+ 新增客戶」" desc="展開客戶資料填寫表單" />
              <Step num={3} title="填寫基本資料" desc="姓名（必填）、WhatsApp/電話、買/租、預算範圍" />
              <Step num={4} title="設定偏好與緊急度" desc="偏好地區用「、」分隔（例：氹仔、新口岸），設定緊急程度" note="🔥 緊急 = 本月要定  🌤 積極 = 1-3個月  ❄️ 慢慢睇" />
              <Step num={5} title="設定下次跟進日期" desc="系統會在客戶卡片顯示提醒日期（金色標示）" />
              <Step num={6} title="點擊「💾 儲存」" desc="客戶資料自動儲存到雲端資料庫" />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>📋 客戶卡片說明</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                {[
                  { color: T.red,    icon: '🔥', label: '紅色標籤（緊急）', desc: '本月要定，優先處理' },
                  { color: T.gold,   icon: '🌤', label: '黃色標籤（積極）', desc: '1-3 個月內有意向' },
                  { color: T.blue,   icon: '❄️', label: '藍色標籤（慢慢睇）', desc: '長線客，保持聯繫' },
                  { color: T.green,  icon: '✅', label: '成交狀態', desc: '下拉更改客戶狀態' },
                  { color: T.muted,  icon: '✏️', label: '編輯按鈕', desc: '隨時更新客戶資料' },
                  { color: T.red,    icon: '🗑', label: '刪除按鈕', desc: '移除不再跟進的客戶' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <span style={{ color: item.color, fontWeight: 600, flexShrink: 0 }}>{item.icon}</span>
                    <div><div style={{ fontWeight: 600, color: item.color }}>{item.label}</div><div style={{ color: T.muted }}>{item.desc}</div></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card style={{ borderColor: `${T.green}30` }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color: T.green }}>💡 客戶跟進小貼士</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: T.muted }}>
              <div>• 每次與客戶聯繫後，立即更新「下次跟進日期」</div>
              <div>• 用備註記錄客戶每次的新要求或想法</div>
              <div>• 成交後及時改狀態為「✅ 成交」，方便業績統計</div>
              <div>• 偏好地區可填多個，方便日後配對新盤時快速篩選</div>
            </div>
          </Card>
        </Section>

        {/* 睇樓記錄 */}
        <Section icon="📸" title="睇樓記錄" color={T.purple}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>📝 新增睇樓記錄</div>
              <Step num={1} title="點擊「📸 睇樓記錄」分頁" desc="進入睇樓記錄管理" />
              <Step num={2} title="點擊「+ 新增睇樓」" desc="填寫睇樓基本資料" />
              <Step num={3} title="填寫盤源及客戶資料" desc="填入樓盤名稱（例：濠景花園 22/F A座）及陪同客戶姓名" />
              <Step num={4} title="選擇日期時間及歷時" desc="記錄實際睇樓時間和停留時長" />
              <Step num={5} title="記錄客戶反應及筆記" desc="選擇客戶反應，在備註填入現場觀察（裝修狀況、景觀、發現問題）" note="💡 詳細的現場筆記可以在日後生成廣告時自動引用" />
              <Step num={6} title="點擊「💾 儲存記錄」" desc="記錄入庫，可在列表點擊展開右側詳情" />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>📷 上傳現場圖片</div>
              <Step num={1} title="點擊睇樓記錄展開詳情" desc="右側展開圖片管理面板" />
              <Step num={2} title="點擊「📷 點擊上傳」" desc="選擇現場拍攝的圖片（可多張）" />
              <Step num={3} title="AI 自動分析（3-5秒）" desc="每張圖片自動完成三件事：" note="① 識別房間類型（客廳/主人房/廚房/浴室/景觀/外牆）&#10;② 生成廣東話描述（20字內）&#10;③ 偵測瑕疵（漏水/裂痕/發霉）— 紅框標記" />
              <Step num={4} title="查看分析結果" desc="每張圖下方顯示房間分類、描述和 AI 標籤" />
            </Card>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { icon: '🛋', label: '客廳', color: T.blue },
              { icon: '🛏', label: '主人房/睡房', color: T.purple },
              { icon: '🍳', label: '廚房', color: T.gold },
              { icon: '🚿', label: '浴室', color: T.green },
              { icon: '🌅', label: '景觀', color: T.blue },
              { icon: '🏙', label: '外牆', color: T.muted },
              { icon: '🚗', label: '車位', color: T.gold },
              { icon: '⚠️', label: '瑕疵', color: T.red },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 14px', background: `${item.color}10`, border: `1px solid ${item.color}30`, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 12, color: item.color, fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: T.muted, textAlign: 'center' }}>AI 自動識別的 8 種房間/場景分類</div>
        </Section>

        {/* 匯出說明 */}
        <Section icon="📤" title="數據匯出" color={T.blue}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ borderColor: `${T.blue}30` }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: T.blue }}>⬇ CSV 匯出（Excel）</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.8 }}>
                1. 在「盤源管理」點右上角「⬇ CSV」<br />
                2. 不勾選 = 匯出全部盤源<br />
                3. 勾選部分 = 只匯出已選盤源<br />
                4. 檔案自動以今日日期命名<br />
                5. 用 Excel / Numbers 直接開啟
              </div>
            </Card>
            <Card style={{ borderColor: `${T.green}30` }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: T.green }}>📋 WhatsApp 格式複製</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.8 }}>
                1. 在盤源列表點擊 📋 按鈕<br />
                2. 自動複製以下格式到剪貼板：
              </div>
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: `1px solid ${T.green}30`, borderRadius: 8, fontSize: 12, lineHeight: 1.8, fontFamily: 'monospace' }}>
                🏢 *濠景花園 出售*<br />
                📍 氹仔  22/F A座<br />
                💰 MOP 580萬（呎價 828）<br />
                📐 700呎  3房 有車位<br />
                ✨ 海景・高層・全新裝修
              </div>
            </Card>
          </div>
        </Section>

        {/* 常見問題 */}
        <Section icon="❓" title="常見問題" color={T.muted}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { q: '截圖上傳後沒有資料？', a: '請確認截圖清晰，文字可見。模糊或角度傾斜的截圖 AI 較難識別。建議用手機截圖（非拍螢幕）。' },
              { q: '關掉瀏覽器後盤源消失了？', a: '盤源資料儲存在瀏覽器 localStorage，清除瀏覽器數據會消失。建議定期點「⬇ CSV 匯出」備份。（客戶及睇樓記錄儲存在雲端，不受影響）' },
              { q: '客戶資料和睇樓圖片安全嗎？', a: '所有數據儲存在 CloudPipe 私有 Supabase 資料庫，只有你的帳號可以存取。圖片儲存在加密 Storage，URL 含隨機碼無法猜測。' },
              { q: 'AI 提取的資料不準確怎麼辦？', a: '直接點擊表格欄位手動修改。信心分數（紅色/黃色）的欄位建議人工核對。AI 準確度會隨截圖清晰度提升。' },
              { q: '可以多台裝置同時使用嗎？', a: '可以。客戶跟進和睇樓記錄雲端同步，多台裝置自動更新。盤源管理目前使用本地儲存，建議固定一台裝置操作。' },
              { q: '如何匯出客戶資料？', a: '目前可截圖或手動整理。下一版本將加入客戶 CSV 匯出功能。如有急需請聯絡 CloudPipe 支援。' },
            ].map(item => (
              <div key={item.q} style={{ padding: '14px 18px', background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Q：{item.q}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>A：{item.a}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>🏢</div>
          <div style={{ fontWeight: 700, color: T.gold, marginBottom: 6 }}>澳門地產盤源管理系統</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>CloudPipe · Demo v1.0 · 2026</div>
          <a href="/macao/property-demo" style={{ display: 'inline-block', padding: '10px 28px', background: 'rgba(245,200,66,0.12)', border: `1px solid ${T.gold}40`, borderRadius: 10, color: T.gold, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            → 開始使用系統
          </a>
          <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            如有技術問題請聯絡 CloudPipe 支援
          </div>
        </div>

      </div>
    </div>
  )
}
