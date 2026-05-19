/**
 * CloudPipe Brand Chat Widget v1.0
 * Self-contained embeddable floating AI chat button + panel
 *
 * Usage:
 *   <script>
 *     window.CloudPipeWidget = {
 *       brandSlug:    'inari-global-foods',
 *       brandName:    '稻荷環球食品',
 *       apiKey:       'optional-api-key',
 *       position:     'bottom-right',   // 'bottom-right' | 'bottom-left'
 *       primaryColor: '#F5C842',
 *       greeting:     '你好！我是稻荷的 AI 策略顧問。'
 *     };
 *   </script>
 *   <script src="https://cloudpipe-macao-app.vercel.app/widget/brand-chat.js" async></script>
 */
;(function () {
  'use strict'

  // ─── Constants ─────────────────────────────────────────────────────────────
  var API_BASE       = 'https://cloudpipe-macao-app.vercel.app'
  var WIDGET_VERSION = '1.0.0'

  // ─── Config ─────────────────────────────────────────────────────────────────
  var cfg          = (typeof window !== 'undefined' && window.CloudPipeWidget) || {}
  var brandSlug    = cfg.brandSlug    || 'cloudpipe'
  var brandName    = cfg.brandName    || 'CloudPipe'
  var apiKey       = cfg.apiKey       || null
  var position     = cfg.position     || 'bottom-right'
  var primaryColor = cfg.primaryColor || '#F5C842'
  var greeting     = cfg.greeting     || ('你好！我是 ' + brandName + ' 的 AI 策略顧問，有什麼可以幫你？')

  // ─── Design tokens ───────────────────────────────────────────────────────────
  var BG       = '#0C1B32'
  var BG_DEEP  = '#08111F'
  var BORDER   = 'rgba(255,255,255,0.06)'
  var TEXT     = '#DCE6F4'
  var MUTED    = 'rgba(220,230,244,0.45)'
  var FAINT    = 'rgba(220,230,244,0.25)'
  var GA       = 'rgba(245,200,66,0.10)'   // gold alpha
  var GB       = 'rgba(245,200,66,0.20)'   // gold border
  var ASST     = 'rgba(255,255,255,0.04)'
  var ASTB     = 'rgba(255,255,255,0.07)'  // assistant bubble border
  var GREEN    = '#4ADE80'

  // ─── State ───────────────────────────────────────────────────────────────────
  var sessionId = getSessionId()
  var messages  = []   // { role: 'user'|'assistant', content: string }[]
  var isLoading = false
  var isOpen    = false

  // ─── DOM refs ────────────────────────────────────────────────────────────────
  var btnEl, panelEl, messagesEl, inputEl, sendBtnEl

  // ─── Session persistence ─────────────────────────────────────────────────────
  function getSessionId() {
    var lsKey = 'cloudpipe_widget_session_' + brandSlug
    try {
      var existing = localStorage.getItem(lsKey)
      if (existing) return existing
      var id = 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)
      localStorage.setItem(lsKey, id)
      return id
    } catch (_) {
      return 'w_' + Date.now().toString(36)
    }
  }

  // ─── Utils ───────────────────────────────────────────────────────────────────
  function esc(str) {
    return (str + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function px(n) { return n + 'px' }

  // ─── CSS injection ────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('cp-widget-css')) return
    var s = document.createElement('style')
    s.id = 'cp-widget-css'
    s.textContent = [
      '@keyframes cp-fadeIn{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes cp-dot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}',
      '#cp-btn{position:fixed;z-index:2147483646;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.45);transition:transform .2s,box-shadow .2s;outline:none;-webkit-tap-highlight-color:transparent}',
      '#cp-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,.55)}',
      '#cp-btn:active{transform:scale(.96)}',
      '#cp-panel{position:fixed;z-index:2147483647;width:360px;height:520px;background:' + BG + ';border:1px solid ' + BORDER + ';border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;animation:cp-fadeIn .22s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '@media(max-width:480px){#cp-panel{width:100vw;height:100dvh;height:100vh;border-radius:0;bottom:0!important;left:0!important;right:0!important;top:0!important}}',
      '#cp-head{display:flex;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid ' + BORDER + ';flex-shrink:0;background:' + BG_DEEP + '}',
      '#cp-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center}',
      '#cp-title-name{font-size:13px;font-weight:600;color:' + TEXT + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#cp-title-sub{font-size:10px;color:' + MUTED + ';display:flex;align-items:center;gap:4px;margin-top:1px}',
      '#cp-close{width:28px;height:28px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:' + MUTED + ';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}',
      '#cp-close:hover{background:rgba(255,255,255,.1);color:' + TEXT + '}',
      '#cp-msgs{flex:1;overflow-y:auto;padding:13px 13px 6px;display:flex;flex-direction:column;gap:9px;scroll-behavior:smooth}',
      '#cp-msgs::-webkit-scrollbar{width:4px}',
      '#cp-msgs::-webkit-scrollbar-track{background:transparent}',
      '#cp-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px}',
      '.cp-row{display:flex}',
      '.cp-row.u{justify-content:flex-end}',
      '.cp-row.a{justify-content:flex-start}',
      '.cp-bub{max-width:82%;padding:9px 13px;font-size:13px;line-height:1.55;color:' + TEXT + ';white-space:pre-wrap;word-break:break-word}',
      '.cp-bub.u{border-radius:12px 12px 3px 12px;background:' + GA + ';border:1px solid ' + GB + '}',
      '.cp-bub.a{border-radius:3px 12px 12px 12px;background:' + ASST + ';border:1px solid ' + ASTB + '}',
      '.cp-typing{display:flex;align-items:center;gap:5px;padding:10px 14px}',
      '.cp-typing span{width:6px;height:6px;border-radius:50%;background:' + MUTED + ';animation:cp-dot 1.2s infinite}',
      '.cp-typing span:nth-child(2){animation-delay:.2s}',
      '.cp-typing span:nth-child(3){animation-delay:.4s}',
      '.cp-sugs{display:flex;flex-wrap:wrap;gap:7px;padding:2px 0 4px}',
      '.cp-sug{font-size:11px;line-height:1.4;padding:5px 11px;border-radius:20px;border:1px solid ' + GB + ';background:' + GA + ';cursor:pointer;text-align:left;transition:background .15s}',
      '.cp-sug:hover{background:rgba(245,200,66,.16)}',
      '#cp-bar{border-top:1px solid ' + BORDER + ';padding:10px 12px;display:flex;gap:8px;flex-shrink:0;background:' + BG_DEEP + '}',
      '#cp-input{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:9px 12px;font-size:13px;color:' + TEXT + ';outline:none;font-family:inherit;transition:border-color .15s}',
      '#cp-input::placeholder{color:' + FAINT + '}',
      '#cp-input:focus{border-color:rgba(245,200,66,.25)}',
      '#cp-send{border:none;border-radius:8px;padding:9px 15px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;flex-shrink:0;font-family:inherit;display:flex;align-items:center}',
      '#cp-foot{text-align:center;padding:5px 0 7px;font-size:10px;color:' + FAINT + ';flex-shrink:0;background:' + BG_DEEP + '}',
      '#cp-foot a{color:rgba(245,200,66,.35);text-decoration:none}',
      '#cp-foot a:hover{color:rgba(245,200,66,.6)}',
    ].join('\n')
    document.head.appendChild(s)
  }

  // ─── SVG icons ────────────────────────────────────────────────────────────────
  var ICO_CHAT = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 2C6.03 2 2 6.03 2 11c0 1.83.54 3.53 1.48 4.95L2.14 19.86c-.15.46.3.87.74.68l4.22-1.86C8.33 19.21 9.63 19.5 11 19.5c4.97 0 9-4.03 9-9S15.97 2 11 2Z" fill="currentColor"/></svg>'
  var ICO_CLOSE = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1.5 1.5 10.5 10.5M10.5 1.5 1.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  var ICO_SEND = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1.5 1.5 12.5 7 1.5 12.5V8.5L9.5 7 1.5 5.5V1.5Z" fill="currentColor"/></svg>'

  // ─── Suggestion prompts ────────────────────────────────────────────────────────
  var SUGS = [
    brandName + ' 目前最大的 AEO 缺口是什麼？',
    '如何讓 Perplexity 開始引用我們的品牌？',
    '有什麼可以提升 Copilot 引用率的內容策略？',
    '現在最應該優先做哪個 AEO 行動？',
  ]

  // ─── DOM helpers ──────────────────────────────────────────────────────────────
  function el(tag, attrs, styles) {
    var node = document.createElement(tag)
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class')      node.className = attrs[k]
        else if (k === 'html')  node.innerHTML = attrs[k]
        else if (k === 'text')  node.textContent = attrs[k]
        else                    node.setAttribute(k, attrs[k])
      }
    }
    if (styles) {
      for (var s in styles) node.style[s] = styles[s]
    }
    return node
  }

  function scrollBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight
  }

  // ─── Send button state ────────────────────────────────────────────────────────
  function setSendState(active) {
    sendBtnEl.disabled = !active
    sendBtnEl.style.background = active ? primaryColor : 'rgba(245,200,66,.08)'
    sendBtnEl.style.color      = active ? '#08111F'    : 'rgba(245,200,66,.3)'
    sendBtnEl.style.cursor     = active ? 'pointer'    : 'not-allowed'
  }

  // ─── Build floating button ────────────────────────────────────────────────────
  function buildButton() {
    btnEl = el('button', { id: 'cp-btn', 'aria-label': brandName + ' AI 顧問', title: brandName + ' AI 顧問', html: ICO_CHAT })
    btnEl.style.background = primaryColor
    btnEl.style.color = '#08111F'
    btnEl.style[position === 'bottom-left' ? 'left' : 'right'] = '20px'
    btnEl.style.bottom = '20px'
    btnEl.addEventListener('click', togglePanel)
    document.body.appendChild(btnEl)
  }

  // ─── Build chat panel ─────────────────────────────────────────────────────────
  function buildPanel() {
    panelEl = el('div', { id: 'cp-panel' })
    panelEl.style.display = 'none'
    panelEl.style[position === 'bottom-left' ? 'left' : 'right'] = '20px'
    panelEl.style.bottom = '88px'

    // Header
    var head = el('div', { id: 'cp-head' })
    var avatar = el('div', { id: 'cp-avatar', html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="6" r="3.5" fill="#08111F"/><path d="M1.5 13.5C1.5 11.01 4.46 9 8 9s6.5 2.01 6.5 4.5" stroke="#08111F" stroke-width="2" stroke-linecap="round"/></svg>' })
    avatar.style.background = primaryColor

    var titleBox = el('div', { id: 'cp-title' }, { flex: '1', minWidth: '0' })
    var titleName = el('div', { id: 'cp-title-name', text: brandName })
    var titleSub  = el('div', { id: 'cp-title-sub', html: '<div style="width:5px;height:5px;border-radius:50%;background:' + GREEN + ';box-shadow:0 0 5px rgba(74,222,128,.6);flex-shrink:0"></div><span>AI 策略顧問 · 在線</span>' })
    titleBox.appendChild(titleName)
    titleBox.appendChild(titleSub)

    var closeBtn = el('button', { id: 'cp-close', 'aria-label': '關閉', html: ICO_CLOSE })
    closeBtn.addEventListener('click', function () { setOpen(false) })

    head.appendChild(avatar)
    head.appendChild(titleBox)
    head.appendChild(closeBtn)

    // Messages area
    messagesEl = el('div', { id: 'cp-msgs' })

    // Input bar
    var bar = el('div', { id: 'cp-bar' })
    inputEl = el('input', { id: 'cp-input', type: 'text', maxlength: '500', autocomplete: 'off', autocorrect: 'off', placeholder: '輸入問題…' })
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    })
    inputEl.addEventListener('input', function () {
      setSendState(inputEl.value.trim().length > 0 && !isLoading)
    })

    sendBtnEl = el('button', { id: 'cp-send', html: ICO_SEND, 'aria-label': '發送' })
    sendBtnEl.addEventListener('click', sendMessage)
    setSendState(false)

    bar.appendChild(inputEl)
    bar.appendChild(sendBtnEl)

    // Footer
    var foot = el('div', { id: 'cp-foot', html: 'Powered by <a href="https://cloudpipe.ai" target="_blank" rel="noopener noreferrer">CloudPipe</a>' })

    panelEl.appendChild(head)
    panelEl.appendChild(messagesEl)
    panelEl.appendChild(bar)
    panelEl.appendChild(foot)

    document.body.appendChild(panelEl)

    renderWelcome()
  }

  // ─── Render welcome screen ────────────────────────────────────────────────────
  function renderWelcome() {
    messagesEl.innerHTML = ''

    // Greeting bubble
    var greetRow = el('div', { class: 'cp-row a' })
    var greetBub = el('div', { class: 'cp-bub a', text: greeting })
    greetRow.appendChild(greetBub)
    messagesEl.appendChild(greetRow)

    // Suggestion chips
    var sugContainer = el('div', { class: 'cp-sugs' })
    SUGS.forEach(function (s) {
      var btn = el('button', { class: 'cp-sug', text: s })
      btn.style.color = primaryColor
      btn.addEventListener('click', function () {
        inputEl.value = s
        setSendState(true)
        sendMessage()
      })
      sugContainer.appendChild(btn)
    })
    messagesEl.appendChild(sugContainer)
  }

  // ─── Append a message bubble ──────────────────────────────────────────────────
  function appendBubble(role, content) {
    var row = el('div', { class: 'cp-row ' + (role === 'user' ? 'u' : 'a') })
    var bub = el('div', { class: 'cp-bub ' + (role === 'user' ? 'u' : 'a'), text: content })
    row.appendChild(bub)
    messagesEl.appendChild(row)
    scrollBottom()
    return row
  }

  // ─── Typing indicator ─────────────────────────────────────────────────────────
  function showTyping() {
    var row = el('div', { class: 'cp-row a', id: 'cp-typing' })
    var bub = el('div', { class: 'cp-bub a cp-typing', html: '<span></span><span></span><span></span>' })
    row.appendChild(bub)
    messagesEl.appendChild(row)
    scrollBottom()
  }

  function hideTyping() {
    var t = document.getElementById('cp-typing')
    if (t) t.remove()
  }

  // ─── Panel open / close ───────────────────────────────────────────────────────
  function setOpen(open) {
    isOpen = open
    panelEl.style.display = open ? 'flex' : 'none'
    if (open) {
      scrollBottom()
      setTimeout(function () { inputEl && inputEl.focus() }, 120)
    }
  }

  function togglePanel() { setOpen(!isOpen) }

  // ─── Send message ─────────────────────────────────────────────────────────────
  function sendMessage() {
    var question = inputEl.value.trim()
    if (!question || isLoading) return

    inputEl.value = ''
    setSendState(false)

    // Clear welcome screen on first real message
    if (messages.length === 0) messagesEl.innerHTML = ''

    messages.push({ role: 'user', content: question })
    appendBubble('user', question)

    isLoading = true
    showTyping()

    var reqBody = {
      question:   question,
      brand_slug: brandSlug,
      session_id: sessionId,
    }
    if (apiKey) reqBody.brand_api_key = apiKey

    fetch(API_BASE + '/api/v1/visibility-chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Widget-Version': WIDGET_VERSION },
      body:    JSON.stringify(reqBody),
    })
      .then(function (res) { return res.json() })
      .then(function (data) {
        hideTyping()
        isLoading = false
        var answer = (data && data.answer) ? data.answer : '暫時無法回應，請稍後再試。'
        messages.push({ role: 'assistant', content: answer })
        appendBubble('assistant', answer)
        setSendState(inputEl.value.trim().length > 0)
      })
      .catch(function () {
        hideTyping()
        isLoading = false
        var errMsg = '連線錯誤，請重試。'
        messages.push({ role: 'assistant', content: errMsg })
        appendBubble('assistant', errMsg)
        setSendState(inputEl.value.trim().length > 0)
      })
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('cp-btn')) return // guard double-init
    injectStyles()
    buildButton()
    buildPanel()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

})()
