'use client'

import { useEffect, useState } from 'react'

interface Customer {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  customer_type: string
  source: string
  tier: string
  total_orders: number
  total_spent: number
  created_at: string
  is_active: boolean
}

interface Stats {
  total: number
  retail: number
  restaurant: number
  vip: number
  thisWeek: number
}

const ADMIN_KEY = 'sue-admin-2026'

export default function SeaUrchinAdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    retail: 0,
    restaurant: 0,
    vip: 0,
    thisWeek: 0,
  })
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/sea-urchin-customers?limit=200', {
        headers: { 'x-admin-key': ADMIN_KEY },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const data = await response.json()
      setCustomers(data.customers || [])

      // Calculate stats
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const retail = data.customers.filter(
        (c: Customer) => c.customer_type === 'retail'
      ).length
      const restaurant = data.customers.filter(
        (c: Customer) => c.customer_type === 'restaurant'
      ).length
      const vip = data.customers.filter((c: Customer) => c.tier === 'gold').length
      const thisWeek = data.customers.filter((c: Customer) => {
        const created = new Date(c.created_at)
        return created > sevenDaysAgo
      }).length

      setStats({
        total: data.customers.length,
        retail,
        restaurant,
        vip,
        thisWeek,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const filtered =
    filter === 'all'
      ? customers
      : customers.filter((c) => c.customer_type === filter)

  const exportCSV = () => {
    const headers = [
      '姓名',
      '電話',
      '電郵',
      '客戶類型',
      '來源',
      '級別',
      '訂單數',
      '總消費',
      '註冊日期',
    ]
    const rows = filtered.map((c) => [
      c.name || '',
      c.phone || '',
      c.email || '',
      c.customer_type,
      c.source,
      c.tier,
      c.total_orders,
      c.total_spent,
      new Date(c.created_at).toLocaleDateString('zh-HK'),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sea-urchin-customers-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">海膽速遞 • 客戶管理</h1>
          <p className="text-zinc-400">⚠️ 管理員頁面 · 請勿分享此 URL</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="總客戶數" value={stats.total} color="bg-amber-500" />
          <StatCard label="個人客戶" value={stats.retail} color="bg-blue-500" />
          <StatCard label="餐廳批發" value={stats.restaurant} color="bg-green-500" />
          <StatCard label="VIP 客戶" value={stats.vip} color="bg-purple-500" />
          <StatCard label="本週新增" value={stats.thisWeek} color="bg-pink-500" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'retail', 'restaurant', 'chef', 'vip'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === type
                    ? 'bg-amber-400 text-black'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                {type === 'all'
                  ? '全部'
                  : type === 'retail'
                    ? '個人'
                    : type === 'restaurant'
                      ? '餐廳'
                      : type === 'chef'
                        ? '主廚'
                        : 'VIP'}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
          >
            📥 匯出 CSV
          </button>
          <button
            onClick={fetchCustomers}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
          >
            🔄 刷新
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-100">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-zinc-400">載入中...</p>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto bg-zinc-900 rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">姓名</th>
                  <th className="px-4 py-3 text-left font-semibold">電話</th>
                  <th className="px-4 py-3 text-left font-semibold">電郵</th>
                  <th className="px-4 py-3 text-left font-semibold">類型</th>
                  <th className="px-4 py-3 text-left font-semibold">來源</th>
                  <th className="px-4 py-3 text-left font-semibold">級別</th>
                  <th className="px-4 py-3 text-center font-semibold">訂單</th>
                  <th className="px-4 py-3 text-center font-semibold">消費 (MOP)</th>
                  <th className="px-4 py-3 text-left font-semibold">註冊日期</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    className={`border-b border-zinc-800 ${
                      idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'
                    } hover:bg-zinc-800 transition`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {customer.name || '未提供'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {customer.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {customer.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          customer.customer_type === 'restaurant'
                            ? 'bg-green-900 text-green-200'
                            : customer.customer_type === 'chef'
                              ? 'bg-orange-900 text-orange-200'
                              : 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {customer.customer_type === 'retail'
                          ? '個人'
                          : customer.customer_type === 'restaurant'
                            ? '餐廳'
                            : '主廚'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {customer.source === 'landing_page'
                        ? '落地頁'
                        : customer.source === 'whatsapp'
                          ? 'WhatsApp'
                          : customer.source}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          customer.tier === 'gold'
                            ? 'bg-yellow-900 text-yellow-200'
                            : customer.tier === 'silver'
                              ? 'bg-gray-500 text-white'
                              : customer.tier === 'restaurant'
                                ? 'bg-purple-900 text-purple-200'
                                : 'bg-amber-900 text-amber-200'
                        }`}
                      >
                        {customer.tier === 'bronze'
                          ? '銅級'
                          : customer.tier === 'silver'
                            ? '銀級'
                            : customer.tier === 'gold'
                              ? '金級'
                              : '批發'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {customer.total_orders}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.total_spent > 0
                        ? customer.total_spent.toFixed(2)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(customer.created_at).toLocaleDateString('zh-HK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="text-zinc-400">沒有客戶記錄</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
          <p>顯示 {filtered.length} 名客戶 (篩選後) · 總計 {stats.total} 名</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className={`${color} rounded-lg p-4 text-black`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
