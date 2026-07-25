import { redirect } from 'next/navigation'

// /about → /macao/about（正本內容喺澳門百科底下，同 pricing/case-studies/certified-shops 等結構頁一致）
export default function AboutRedirect() {
  redirect('/macao/about')
}
