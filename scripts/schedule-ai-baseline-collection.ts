#!/usr/bin/env node
/**
 * OpenClaw Bulletin Executor Task — AI Search Baseline Collection
 *
 * 執行方式：每日 02:00 UTC（在爬蟲高峰前）自動蒐集 AI 搜尋基線
 *
 * 注冊至 OpenClaw 排程:
 *   ~/.openclaw/workspace/tasks/ai-baseline-collection.json
 */

import { execSync } from 'child_process'
import * as fs from 'fs'

interface ScheduleConfig {
  taskId: string
  name: string
  schedule: string // cron 表達式
  brands: string[]
  command: string
}

const config: ScheduleConfig = {
  taskId: 'ai-baseline-collection-daily',
  name: 'AI 搜尋基線每日收集',
  schedule: '0 2 * * *', // 每天 02:00 UTC
  brands: ['inari-global-foods', 'after-school-coffee', 'mind-coffee', 'sea-urchin-delivery'],
  command: 'npx ts-node scripts/collect-ai-search-baseline.ts',
}

async function registerSchedule() {
  const workspacePath = process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspace'
  const tasksDir = `${workspacePath}/tasks`

  // 創建任務目錄
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true })
  }

  // 為每個品牌生成任務
  for (const brand of config.brands) {
    const taskFile = `${tasksDir}/ai-baseline-${brand}.json`
    const taskConfig = {
      id: `ai-baseline-${brand}`,
      name: `${brand} - AI 搜尋基線`,
      description: `每日 02:00 UTC 收集 ${brand} 的 AI 搜尋排名基線`,
      schedule: config.schedule,
      command: `${config.command} --brand ${brand}`,
      timeout: 600000, // 10 分鐘超時
      retries: 1,
      notifyOnFailure: true,
    }

    fs.writeFileSync(taskFile, JSON.stringify(taskConfig, null, 2))
    console.log(`✅ 已寫入任務配置: ${taskFile}`)
  }

  console.log(`\n📋 已註冊 ${config.brands.length} 個每日排程任務`)
  console.log(`⏰ 排程時間: ${config.schedule} (每天 02:00 UTC)`)
  console.log(`\n後續步驟:`)
  console.log(`1. 檢查 ~/.openclaw/workspace/tasks/ 目錄`)
  console.log(`2. OpenClaw Bulletin Executor 會自動拾取這些任務`)
  console.log(`3. 查看日誌: tail -f ~/.openclaw/workspace/logs/bulletin-executor.log`)
}

// 執行
registerSchedule().catch(console.error)
