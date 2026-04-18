import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { getB2bCustomer, getProducts } from '@/lib/inari-supabase'
import { TIER_DISCOUNT, TIER_LABEL } from '@/types/inari'

export const dynamic = 'force-dynamic'

async function getAuthUser() {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  if (!accessToken) return null
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await client.auth.getUser(accessToken)
    return data.user
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user?.email) redirect('/inari/portal')

  const customer = await getB2bCustomer(user.email)
  if (!customer?.is_active) {
    return (
      <div className="pt-40 max-w-2xl mx-auto px-6 text-center">
        <p className="text-[#C9A961] text-xl mb-4">帳戶審核中</p>
        <p className="text-[#F5F0E8]/60">
          您的批發帳戶申請已收到，Kira 將在 1-2 個工作天內完成審核。<br />
          如有疑問請 WhatsApp 聯絡。
        </p>
      </div>
    )
  }

  const products = await getProducts({ limit: 50 })
  const discount = TIER_DISCOUNT[customer.tier]

  return (
    <div className="pt-28 max-w-6xl mx-auto px-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <p className="text-[#C9A961]/60 text-xs tracking-widest mb-2">批發專區</p>
          <h1 className="text-3xl font-light">{customer.company_name}</h1>
          <p className="text-[#F5F0E8]/50 mt-1">
            {TIER_LABEL[customer.tier]} · 批發折扣 {Math.round((1 - discount) * 100)}%
          </p>
        </div>
        <div className="text-right text-sm text-[#F5F0E8]/40">
          <p>信用額度：MOP {customer.credit_limit.toLocaleString()}</p>
          <p>付款條款：{customer.payment_terms}</p>
        </div>
      </div>

      {/* Wholesale Price List */}
      <h2 className="text-xl font-light text-[#C9A961] mb-6">批發價目表</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#C9A961]/20 text-[#F5F0E8]/40 text-left">
              <th className="pb-3 pr-6">產品</th>
              <th className="pb-3 pr-6">產地</th>
              <th className="pb-3 pr-6">規格</th>
              <th className="pb-3 pr-6">零售價</th>
              <th className="pb-3 pr-6">您的批發價</th>
              <th className="pb-3 pr-6">庫存</th>
              <th className="pb-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const wholesale = p.retail_price ? Math.round(p.retail_price * discount) : null
              return (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-4 pr-6">
                    <p className="font-medium">{p.name_zh}</p>
                    <p className="text-[#F5F0E8]/30 text-xs">{p.name_en}</p>
                  </td>
                  <td className="py-4 pr-6 text-[#F5F0E8]/60">{p.origin_region}</td>
                  <td className="py-4 pr-6 text-[#F5F0E8]/60">{p.unit_weight_g}g/{p.unit}</td>
                  <td className="py-4 pr-6 text-[#F5F0E8]/40 line-through">
                    {p.retail_price ? `MOP ${p.retail_price}` : '—'}
                  </td>
                  <td className="py-4 pr-6 text-[#C9A961] font-semibold">
                    {wholesale ? `MOP ${wholesale}` : '—'}
                  </td>
                  <td className="py-4 pr-6">
                    <span className={p.stock_qty > 0 ? 'text-green-400' : 'text-red-400'}>
                      {p.stock_qty > 0 ? `${p.stock_qty} ${p.unit}` : '缺貨'}
                    </span>
                  </td>
                  <td className="py-4">
                    {p.stock_qty > 0 && (
                      <Link
                        href={`/inari/portal/order?product=${p.slug}`}
                        className="text-xs border border-[#C9A961]/50 text-[#C9A961] px-3 py-1 hover:bg-[#C9A961] hover:text-[#0A1628] transition-colors"
                      >
                        下單
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Order via WhatsApp */}
      <div className="mt-12 border border-[#C9A961]/20 p-6 flex justify-between items-center">
        <div>
          <p className="text-[#C9A961] font-semibold mb-1">快速下單</p>
          <p className="text-[#F5F0E8]/50 text-sm">WhatsApp 直接告知需求，Kira 即時確認</p>
        </div>
        <a
          href="https://wa.me/853XXXXXXXX?text=批發下單：公司：{customer.company_name}"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 bg-[#C9A961] text-[#0A1628] font-semibold hover:bg-[#C9A961]/90 transition-colors"
        >
          WhatsApp 下單
        </a>
      </div>
    </div>
  )
}
