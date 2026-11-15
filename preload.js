const { ipcRenderer } = require('electron')


function patchNotification() {
  function PatchedNotification(title, options = {}) {
    ipcRenderer.send('show-notification', {
      title: title,
      body: options.body || '',
      icon: options.icon || ''
    })
    return {
      close: () => {},
      onclick: null,
      onshow: null,
      onerror: null,
      onclose: null
    }
  }

  PatchedNotification.permission = 'granted'
  PatchedNotification.requestPermission = () => Promise.resolve('granted')

  try {
    Object.defineProperty(window, 'Notification', {
      value: PatchedNotification,
      writable: true,
      configurable: true
    })
  } catch (e) {

  }
}


const adKeywords = [
  'Sponsored Message',
  'Proxy Sponsor',
  '点击我私聊',
  '本群承接',
  '跑分',
  '承兑',
  '回U',
  '下发',
  '费率',
  '点位',
  '四件套',
  '实名号',
  '查档',
  '定位',
  '开房记录',
  '轰炸',
  '数据源',
  '精准粉',
  '引流',
  '宝妈',
  '手工',
  '修车',
  '萝莉',
  '流水'
]

function initAdFilter() {
  if (!document.head || !document.body) return

  const style = document.createElement('style')
  style.textContent = `
    .has-advertisement {
      opacity: 0.15 !important;
      transition: opacity 0.2s;
    }
    .has-advertisement:hover {
      opacity: 1 !important;
    }
  `
  document.head.appendChild(style)

  function walk(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList && node.classList.contains('bubble')) {
        handleMessageNode(node)
      }
      for (const child of node.children) {
        walk(child)
      }
    }
  }

  function handleMessageNode(bubble) {
    if (bubble.classList.contains('has-advertisement')) return

    const text = (bubble.textContent || '').toLowerCase()
    if (!text) return

    const matched = adKeywords.some(kw => text.includes(kw.toLowerCase()))
    if (matched) {
      bubble.classList.add('has-advertisement')
      bubble.title = 'Содержимое скрыто фильтром рекламы'
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        walk(node)
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
  walk(document.body)
}

function initWindowControls() {
  if (!document.body) return
  if (document.getElementById('mac-window-controls')) return

  const container = document.createElement('div')
  container.id = 'mac-window-controls'


  const dragBar = document.createElement('div')
  dragBar.id = 'mac-drag-bar'

  const btnClose = document.createElement('button')
  btnClose.className = 'mac-btn mac-close'
  btnClose.title = 'Закрыть'
  btnClose.innerHTML = '&times;'

  const btnMin = document.createElement('button')
  btnMin.className = 'mac-btn mac-min'
  btnMin.title = 'Свернуть'
  btnMin.innerHTML = '&#8211;'

  const btnMax = document.createElement('button')
  btnMax.className = 'mac-btn mac-max'
  btnMax.title = 'Развернуть'
  btnMax.innerHTML = '+'

  // Обработчики
  btnClose.addEventListener('click', () => {
    ipcRenderer.send('window-close')
  })
  btnMin.addEventListener('click', () => {
    ipcRenderer.send('window-minimize')
  })
  btnMax.addEventListener('click', () => {
    ipcRenderer.send('window-maximize-toggle')
  })


  ipcRenderer.on('window-maximized', (event, isMax) => {
    btnMax.innerHTML = isMax ? '&#10064;' : '+'
    btnMax.title = isMax ? 'Восстановить' : 'Развернуть'
  })


  ipcRenderer.invoke('window-is-maximized').then((isMax) => {
    btnMax.innerHTML = isMax ? '&#10064;' : '+'
    btnMax.title = isMax ? 'Восстановить' : 'Развернуть'
  })

  container.appendChild(btnClose)
  container.appendChild(btnMin)
  container.appendChild(btnMax)

  document.body.appendChild(dragBar)
  document.body.appendChild(container)

  // Стили
  const style = document.createElement('style')
  style.textContent = `
    #mac-drag-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 32px;
      -webkit-app-region: drag;
      z-index: 2147483000;
      pointer-events: auto;
      background: transparent;
    }

    #mac-window-controls {
      position: fixed;
      top: 0;
      left: 0;
      height: 32px;
      display: flex;
      align-items: center;
      padding-left: 10px;
      gap: 8px;
      z-index: 2147483001;
      -webkit-app-region: no-drag;
    }

    .mac-btn {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      border: none;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      line-height: 1;
      font-weight: bold;
      color: rgba(0, 0, 0, 0.55);
      opacity: 0;
      transition: opacity 0.15s;
      -webkit-app-region: no-drag;
    }

    #mac-window-controls:hover .mac-btn {
      opacity: 1;
    }

    .mac-close { background-color: #ff5f57; }
    .mac-min   { background-color: #febc2e; }
    .mac-max   { background-color: #28c840; }
  `
  document.head.appendChild(style)
}

patchNotification()

function init() {
  initAdFilter()
  initWindowControls()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init)
} else {
  init()
}