import { notFound } from 'next/navigation'
import { getOrderByNo } from '@/lib/inari-supabase'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending: '待確認', confirmed: '已確認', processing: '備貨中',
  shipped: '已出貨', delivered: '已送達', cancelled: '已取消',
}
const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default async function OrderTrackingPage({ params }: { params: { id: string } }) {
  const order = await getOrderByNo(params.id)
  if (!order) notFound()

  const currentStep = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="pt-28 max-w-3xl mx-auto px-6 pb-24">
      <p className="text-[#C9A961]/60 text-xs tracking-widest mb-2">訂單追蹤</p>
      <h1 className="text-2xl font-light mb-1">{order.order_no}</h1>
      <p className="text-[#F5F0E8]/40 text-sm mb-10">{new Date(order.created_at).toLocaleDateString('zh-HK')}</p>

      {/* Progress */}
      {order.status !== 'cancelled' && (
        <div className="flex items-center mb-12">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs
                ${i <= currentStep ? 'border-[#C9A961] bg-[#C9A961] text-[#0A1628]' : 'border-white/20 text-white/20'}`}>
                {i + 1}
              </div>
              <div className="flex-1 last:hidden h-px bg-white/10 mx-2" />
            </div>
          ))}
        </div>
      )}
      <p className="text-center text-[#C9A961] text-lg mb-10">{STATUS_LABELS[order.status]}</p>

      {/* Items */}
      <div className="border border-[#C9A961]/20 p-6 mb-6">
        <h2 className="text-sm text-[#F5F0E8]/40 mb-4">訂單明細</h2>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-white/5 text-sm last:border-0">
            <span>{item.name_zh} × {item.qty}</span>
            <span className="text-[#C9A961]">MOP {item.subtotal.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between pt-4 font-semibold">
          <span>合計</span>
          <span className="text-[#C9A961]">MOP {order.total?.toLocaleString() ?? '—'}</span>
        </div>
      </div>

      {/* Cold Chain Log */}
      {order.cold_chain_log.length > 0 && (
        <div className="border border-[#C9A961]/20 p-6">
          <h2 className="text-sm text-[#F5F0E8]/40 mb-4">冷鏈記錄</h2>
          {order.cold_chain_log.map((log, i) => (
            <div key={i} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
              <div>
                <p>{log.location}</p>
                <p className="text-[#F5F0E8]/40 text-xs">{new Date(log.timestamp).toLocaleString('zh-HK')}</p>
              </div>
              <div className="text-right">
                <p className={log.temperature_c <= 4 ? 'text-green-400' : 'text-red-400'}>
                  {log.temperature_c}°C
                </p>
                <p className="text-[#F5F0E8]/40 text-xs">{log.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
