'use client';

import { useState, useEffect, useRef } from 'react';
import './page.css';

/* ============================================================
   Types
   ============================================================ */
interface FaqItem {
  q: string;
  a: string;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  customer_type: string;
  notes: string;
}

/* ============================================================
   Constants
   ============================================================ */
const WA_LINK = 'https://wa.me/85362823037?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E6%9F%A5%E8%A9%A2%E6%B5%B7%E8%86%BD%E5%A5%97%E8%A3%9D';
const WA_PHONE = '+853 6285 4078';

const FAQS: FaqItem[] = [
  {
    q: '海膽有多新鮮？',
    a: '每週四從日本空運抵澳，週五配送到客戶手中，從出水到送達不超過 72 小時。採用真空急凍包裝配合冷鏈袋，全程維持 2-8°C。',
  },
  {
    q: '配送覆蓋哪些地區？',
    a: '澳門半島、氹仔、路環均可配送。離島地區視訂單量安排，可 WhatsApp 查詢具體地址。',
  },
  {
    q: '最低訂購量是多少？',
    a: '散客最低 100g 起訂。餐廳及商業採購最低 1kg，享批發價格及優先配送。',
  },
  {
    q: '可以提貨嗎？',
    a: '可以。氹仔自設提貨點，每週五 14:00-18:00，歡迎提前預約。',
  },
  {
    q: '如何保存？',
    a: '收貨後請立即放入雪櫃 0-4°C 冷藏，建議當天品嚐。如需保存，可放入冰格急凍，保存期 2 週。',
  },
  {
    q: '退款政策如何？',
    a: '收貨後如品質有問題，請即拍照聯絡我們。新鮮度不達標可申請退款或補貨，以保障您的權益。',
  },
];

/* ============================================================
   Reveal hook — IntersectionObserver
   ============================================================ */
function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ============================================================
   Sub-components
   ============================================================ */

/* --- TopNav --- */
function TopNav() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sue-nav">
      <div className="sue-nav-inner">
        <span className="sue-nav-logo serif">海膽速遞</span>
        <ul className="sue-nav-links">
          <li><a href="#about" onClick={e => { e.preventDefault(); scrollTo('about'); }}>關於我們</a></li>
          <li><a href="#products" onClick={e => { e.preventDefault(); scrollTo('products'); }}>產品</a></li>
          <li><a href="#order" onClick={e => { e.preventDefault(); scrollTo('order'); }}>訂購</a></li>
        </ul>
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="sue-btn-gold"
        >
          WhatsApp 立即訂購 →
        </a>
      </div>
    </nav>
  );
}

/* --- Hero --- */
function Hero() {
  const leftRef = useReveal();
  const rightRef = useReveal();

  return (
    <section className="sue-hero">
      <div className="sue-hero-inner">
        {/* Left */}
        <div ref={leftRef} className="reveal">
          <span className="sue-hero-label">澳門唯一海膽直送服務</span>
          <h1 className="sue-hero-h1 serif">
            澳門<span>餐廳級</span>海膽<br />即日冷鏈送達
          </h1>
          <p className="sue-hero-sub">
            日本北海道・大連・愛爾蘭
          </p>
          <p className="sue-hero-desc">
            三大產地直送 · 餐廳同款品質<br />
            每週新鮮空運，全程 2-8°C 冷鏈保障
          </p>
          <div className="sue-hero-cta">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="sue-btn-gold"
            >
              WhatsApp 立即訂購 →
            </a>
            <a
              href="#products"
              className="sue-btn-outline"
              onClick={e => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              查看產品 ↓
            </a>
          </div>
          <div className="sue-trust-row">
            <span className="sue-trust-item"><span>🧊</span> 冷鏈配送</span>
            <span className="sue-trust-item"><span>✦</span> 餐廳同款</span>
            <span className="sue-trust-item"><span>🇯🇵</span> 日本直送</span>
            <span className="sue-trust-item"><span>⭐</span> 500+ 客戶</span>
          </div>
        </div>

        {/* Right — product placeholder */}
        <div ref={rightRef} className="sue-hero-img reveal">
          <span style={{ fontSize: 80, position: 'relative', zIndex: 1 }}>🦔</span>
          <span className="sue-hero-img-label">北海道馬糞海膽</span>
        </div>
      </div>
    </section>
  );
}

/* --- Trust Bar --- */
function TrustBar() {
  return (
    <div className="sue-trust-bar" id="about">
      <div className="sue-trust-bar-inner">
        {[
          ['🧊', '冷鏈全程 2-8°C'],
          ['✈️', '每週三抵澳'],
          ['📦', '真空急凍包裝'],
          ['🍣', '500+ 餐廳客戶'],
        ].map(([icon, text]) => (
          <div className="sue-trust-bar-item" key={text}>
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Product card (hooks at top level) --- */
interface ProductData {
  title: string;
  price: string;
  priceNote?: string;
  items: string[];
  meta: string;
  waText: string;
  featured?: boolean;
  isEnquiry?: boolean;
  delay: number;
}

function ProductCard({ p }: { p: ProductData }) {
  const ref = useReveal();
  const waHref = `https://wa.me/85362823037?text=${p.waText}`;
  return (
    <div
      ref={ref}
      className={`sue-card reveal${p.featured ? ' featured' : ''}`}
      style={{ transitionDelay: `${p.delay}s` }}
    >
      {p.featured && <span className="sue-card-badge">最受歡迎</span>}
      <h3 className="sue-card-title serif">{p.title}</h3>
      <div className="sue-card-price">
        {p.price}
        {p.priceNote && <span>{p.priceNote}</span>}
      </div>
      <ul className="sue-card-list">
        {p.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="sue-card-meta">{p.meta}</p>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="sue-card-btn"
      >
        {p.isEnquiry ? 'WhatsApp 查詢' : 'WhatsApp 訂購'}
      </a>
    </div>
  );
}

/* --- Products --- */
function Products() {
  const ref = useReveal();

  const products: ProductData[] = [
    {
      title: '家庭鑑賞套裝',
      price: 'MOP $380',
      items: [
        '北海道馬糞海膽 × 100g',
        '適合：壽司 · 海膽飯 · 直接品嚐',
      ],
      meta: '本週截單：週三 23:59',
      waText: '%E6%88%91%E6%83%B3%E8%A8%82%E8%B3%BC%E5%AE%B6%E5%BA%AD%E9%91%91%E8%B3%9E%E5%A5%97%E8%A3%9DMOP380',
      featured: false,
      delay: 0,
    },
    {
      title: '主廚精選套裝',
      price: 'MOP $680',
      items: [
        '北海道馬糞 + 大連紫海膽 × 各 100g',
        '兩產地對比品鑑',
        '附品鑑說明書',
      ],
      meta: '最受歡迎組合 · 本週截單：週三 23:59',
      waText: '%E6%88%91%E6%83%B3%E8%A8%82%E8%B3%BC%E4%B8%BB%E5%BB%9A%E7%B2%BE%E9%81%B8%E5%A5%97%E8%A3%9DMOP680',
      featured: true,
      delay: 0.1,
    },
    {
      title: '餐廳採購套裝',
      price: '按量報價',
      priceNote: '1kg 起訂',
      items: [
        '每週固定供應',
        '批發優先價格',
        '支持發票',
      ],
      meta: '商業採購 · 請 WhatsApp 查詢',
      waText: '%E6%88%91%E6%98%AF%E9%A4%90%E5%BB%B3%EF%BC%8C%E6%83%B3%E6%9F%A5%E8%A9%A2%E6%89%B9%E7%99%BC%E5%83%B9%E6%A0%BC',
      featured: false,
      isEnquiry: true,
      delay: 0.2,
    },
  ];

  return (
    <section className="sue-section sue-products" id="products">
      <div className="sue-section-inner">
        <div ref={ref} className="reveal">
          <span className="sue-section-tag">本週精選</span>
          <h2 className="sue-section-title serif">本週精選套裝</h2>
          <p className="sue-section-lead">每週四空運抵澳，新鮮直送到府。截單日：週三 23:59</p>
        </div>

        <div className="sue-products-grid">
          {products.map(p => (
            <ProductCard key={p.title} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Step card (hooks at top level) --- */
interface StepData {
  icon: string;
  title: string;
  desc: string;
  num: string;
  delay: number;
}

function StepCard({ s }: { s: StepData }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className="sue-step reveal"
      style={{ transitionDelay: `${s.delay}s` }}
    >
      <span className="sue-step-num">{s.num}</span>
      <span className="sue-step-icon">{s.icon}</span>
      <h3 className="sue-step-title serif">{s.title}</h3>
      <p className="sue-step-desc">{s.desc}</p>
    </div>
  );
}

/* --- How It Works --- */
function HowItWorks() {
  const ref = useReveal();

  const steps: StepData[] = [
    { icon: '📱', title: 'WhatsApp 落單', desc: '每週三截單，確認庫存及配送時段', num: '01', delay: 0 },
    { icon: '✈️', title: '週四空運抵澳', desc: '全程冷鏈，新鮮度有保障，抵港即通知', num: '02', delay: 0.12 },
    { icon: '📦', title: '週五冷鏈配送', desc: '澳門半島 / 氹仔 / 路環均覆蓋', num: '03', delay: 0.24 },
    { icon: '🍽️', title: '當日品嚐', desc: '開箱即食或冷藏 48 小時，品質保證', num: '04', delay: 0.36 },
  ];

  return (
    <section className="sue-section" id="order">
      <div className="sue-section-inner">
        <div ref={ref} className="reveal">
          <span className="sue-section-tag">訂購流程</span>
          <h2 className="sue-section-title serif">如何訂購</h2>
          <p className="sue-section-lead">四個簡單步驟，新鮮海膽送達府上</p>
        </div>

        <div className="sue-steps-grid">
          {steps.map(s => (
            <StepCard key={s.num} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Social Proof --- */
function SocialProof() {
  const ref = useReveal();
  const quoteRef = useReveal();

  return (
    <section className="sue-section sue-social-proof">
      <div className="sue-section-inner">
        <div ref={ref} className="reveal">
          <span className="sue-section-tag">合作夥伴</span>
          <h2 className="sue-section-title serif">海膽速遞合作餐廳</h2>
          <p className="sue-section-lead" style={{ marginBottom: 32 }}>
            澳門逾 30 家日式料理、高級餐廳長期採購合作
          </p>
        </div>

        <div className="sue-restaurant-grid" style={{ marginBottom: 64 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sue-restaurant-logo">
              合作餐廳
            </div>
          ))}
        </div>

        <div ref={quoteRef} className="sue-quote-block reveal">
          <span className="sue-quote-mark">&ldquo;</span>
          <p className="sue-quote-text">
            每週的海膽品質非常穩定，比我們以往的供應商新鮮度高出一個層次。
            冷鏈做得很好，基本上收到就可以直接出菜。
          </p>
          <p className="sue-quote-attr">
            — <strong>澳門某日本料理主廚</strong> · 合作 18 個月
          </p>
        </div>
      </div>
    </section>
  );
}

/* --- FAQ --- */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const ref = useReveal();

  const toggle = (i: number) => setOpenIdx(prev => (prev === i ? null : i));

  return (
    <section className="sue-section">
      <div className="sue-section-inner">
        <div ref={ref} className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="sue-section-tag">FAQ</span>
          <h2 className="sue-section-title serif">常見問題</h2>
        </div>

        <div className="sue-faq-list">
          {FAQS.map((item, i) => (
            <div key={i} className={`sue-faq-item${openIdx === i ? ' open' : ''}`}>
              <button
                className="sue-faq-trigger"
                onClick={() => toggle(i)}
                aria-expanded={openIdx === i}
              >
                <span>{item.q}</span>
                <span className="sue-faq-icon">+</span>
              </button>
              <div className="sue-faq-body" aria-hidden={openIdx !== i}>
                <p className="sue-faq-answer">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Member Form --- */
function MemberForm() {
  const ref = useReveal();
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    customer_type: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('請填寫姓名及聯絡電話');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/sea-urchin-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'landing_page' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || '提交失敗，請稍後再試');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="sue-section sue-form-section" id="signup">
      <div className="sue-section-inner">
        <div ref={ref} className="reveal sue-form-wrap">
          <div className="sue-form-header">
            <h2 className="sue-form-header-title serif">加入私人客戶名單</h2>
            <p className="sue-form-header-sub">
              每週優先通知
              <span>·</span>
              獨家會員優惠
              <span>·</span>
              餐廳批發資格
            </p>
          </div>

          <div className="sue-form-body">
            {submitted ? (
              <div className="sue-form-success">
                <div className="sue-form-success-icon">✅</div>
                <h3 className="sue-form-success-title serif">登記成功！</h3>
                <p className="sue-form-success-desc">
                  感謝您的登記。我們會在本週內以 WhatsApp 聯絡您，確認會員資格及本週精選套裝。
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {error && <div className="sue-form-error-msg">{error}</div>}

                <div className="sue-form-grid">
                  <div className="sue-form-field">
                    <label className="sue-form-label" htmlFor="sue-name">姓名 *</label>
                    <input
                      id="sue-name"
                      name="name"
                      type="text"
                      className="sue-form-input"
                      placeholder="您的姓名"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="sue-form-field">
                    <label className="sue-form-label" htmlFor="sue-phone">聯絡電話 * (WhatsApp 號碼)</label>
                    <input
                      id="sue-phone"
                      name="phone"
                      type="tel"
                      className="sue-form-input"
                      placeholder="+853 XXXX XXXX"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="sue-form-field">
                  <label className="sue-form-label" htmlFor="sue-email">電郵地址</label>
                  <input
                    id="sue-email"
                    name="email"
                    type="email"
                    className="sue-form-input"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="sue-form-field">
                  <label className="sue-form-label" htmlFor="sue-type">客戶類型</label>
                  <select
                    id="sue-type"
                    name="customer_type"
                    className="sue-form-select"
                    value={form.customer_type}
                    onChange={handleChange}
                  >
                    <option value="">請選擇...</option>
                    <option value="individual">個人客戶</option>
                    <option value="restaurant">餐廳 / 酒店</option>
                    <option value="chef">主廚 / 廚師</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div className="sue-form-field">
                  <label className="sue-form-label" htmlFor="sue-notes">備注</label>
                  <textarea
                    id="sue-notes"
                    name="notes"
                    className="sue-form-textarea"
                    placeholder="配送地址、特別要求等"
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  className="sue-form-submit"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '提交登記'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --- Footer --- */
function Footer() {
  return (
    <footer className="sue-footer">
      <p className="sue-footer-logo serif">海膽速遞</p>
      <p className="sue-footer-tagline">© 2026 · 澳門唯一海膽直送服務</p>

      <div className="sue-footer-links">
        <a
          href={`https://wa.me/85362823037`}
          target="_blank"
          rel="noopener noreferrer"
          className="sue-footer-link"
        >
          <span>💬</span>
          <span>{WA_PHONE}</span>
        </a>
        <a href="mailto:seafood@cloudpipe.ai" className="sue-footer-link">
          <span>✉️</span>
          <span>seafood@cloudpipe.ai</span>
        </a>
        <a
          href="https://instagram.com/sea_urchin_macao"
          target="_blank"
          rel="noopener noreferrer"
          className="sue-footer-link"
        >
          <span>📷</span>
          <span>@sea_urchin_macao</span>
        </a>
      </div>

      <div className="sue-footer-divider" />

      <p className="sue-footer-credit">
        由 <a href="https://cloudpipe.ai" target="_blank" rel="noopener noreferrer">CloudPipe</a> 提供技術支持
      </p>
    </footer>
  );
}

/* --- Sticky WhatsApp Button --- */
function StickyWA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const heroEl = document.querySelector('.sue-hero');
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="sue-wa-sticky"
      style={{ opacity: show ? 1 : 0, pointerEvents: show ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}
      aria-label="WhatsApp 立即訂購"
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      立即訂購
    </a>
  );
}

/* ============================================================
   Page Root
   ============================================================ */
export default function SeaUrchinPage() {
  return (
    <div className="sue-root">
      <TopNav />
      <Hero />
      <TrustBar />
      <Products />
      <HowItWorks />
      <SocialProof />
      <FAQ />
      <MemberForm />
      <Footer />
      <StickyWA />
    </div>
  );
}
