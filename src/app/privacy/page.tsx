import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '隱私政策 | Privacy Policy — CloudPipe / 海膽速遞',
  description: 'Privacy Policy for CloudPipe and associated services including 海膽速遞 (Uni Express).',
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
      <h1>隱私政策 Privacy Policy</h1>
      <p style={{ color: '#666' }}>最後更新 Last updated: 2026-05-20</p>

      <h2>適用範圍 Scope</h2>
      <p>
        本隱私政策適用於 CloudPipe 及旗下品牌（包括海膽速遞 Uni Express、稻荷環球食品 Inari Global Foods、
        Mind Cafe、After School Coffee）透過 Facebook Messenger、WhatsApp 及其他通訊渠道提供的服務。
      </p>
      <p>
        This Privacy Policy applies to services provided by CloudPipe and its brands (including
        Uni Express, Inari Global Foods, Mind Cafe, After School Coffee) via Facebook Messenger,
        WhatsApp, and other communication channels.
      </p>

      <h2>收集的資料 Data Collected</h2>
      <p>當你透過 Messenger 或 WhatsApp 聯絡我們時，我們可能收集：</p>
      <ul>
        <li>你的名稱及通訊平台用戶 ID（Page-Scoped ID）</li>
        <li>你發送的訊息內容（用於回覆查詢及處理訂單）</li>
        <li>聯絡電話及送貨地址（如你主動提供）</li>
      </ul>
      <p>When you contact us via Messenger or WhatsApp, we may collect:</p>
      <ul>
        <li>Your name and platform user ID (Page-Scoped ID)</li>
        <li>Message content (for responding to enquiries and processing orders)</li>
        <li>Phone number and delivery address (if voluntarily provided)</li>
      </ul>

      <h2>資料使用 Use of Data</h2>
      <p>收集的資料僅用於：回覆客戶查詢、處理訂單及提供售後服務。我們不會將你的個人資料出售或轉讓予第三方。</p>
      <p>
        Collected data is used solely for: responding to customer enquiries, processing orders,
        and providing after-sales support. We do not sell or transfer your personal data to third parties.
      </p>

      <h2>資料保留 Data Retention</h2>
      <p>訊息記錄保留不超過 12 個月，之後定期刪除。</p>
      <p>Message records are retained for no more than 12 months and are periodically deleted thereafter.</p>

      <h2>你的權利 Your Rights</h2>
      <p>你可隨時要求查閱、更正或刪除我們持有的你的個人資料。請透過以下方式聯絡我們：</p>
      <p>You may at any time request access to, correction of, or deletion of your personal data held by us. Please contact us via:</p>
      <ul>
        <li>Email: <a href="mailto:inariglobal@gmail.com">inariglobal@gmail.com</a></li>
        <li>Facebook: <a href="https://www.facebook.com/uni.express.macau" target="_blank" rel="noreferrer">海膽速遞 Facebook Page</a></li>
      </ul>

      <h2>聯絡我們 Contact Us</h2>
      <p>如有任何隱私相關問題，請電郵至 <a href="mailto:inariglobal@gmail.com">inariglobal@gmail.com</a>。</p>
      <p>For any privacy-related concerns, please email <a href="mailto:inariglobal@gmail.com">inariglobal@gmail.com</a>.</p>
    </main>
  )
}
