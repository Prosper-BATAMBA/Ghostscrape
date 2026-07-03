;(function () {
  if (window.__gs_initialized) return
  if (location.origin === 'http://localhost:3000' || location.origin === 'https://localhost:3000' || location.origin === 'http://localhost:8000') return
  window.__gs_initialized = true

  console.log('[GS] content script loaded — inline mode')

  window.GS = window.GS || {}

  // ---- SelectorTools (utilities) ----
  GS.SelectorTools = {
    resolveUrl: function (url) {
      if (!url) return ''
      try { return new URL(url, document.baseURI).href } catch (e) { return url }
    },
  }

  // ---- MessagingService ----
  GS.MessagingService = {
    _port: null,
    _messageHandlers: [],
    _reconnectTimer: null,
    _reconnectAttempts: 0,
    _maxReconnectDelay: 10000,
    _reconnectDelays: [0, 200, 500, 1000, 2000, 5000],

    init: function () {
      var self = this
      var port

      try {
        port = chrome.runtime.connect({ name: 'gs-content' })
      } catch (e) {
        console.error('[GS] connect failed:', e)
        this._onFailedConnect()
        return
      }

      if (!port) {
        console.warn('[GS] connect returned null port')
        this._onFailedConnect()
        return
      }

      this._port = port

      port.onMessage.addListener(function (msg) {
        console.log('[GS] incoming message:', msg.type)
        self._messageHandlers.forEach(function (h) { h(msg) })
      })

      var disconnected = false
      port.onDisconnect.addListener(function () {
        disconnected = true
        self._port = null
        self._scheduleReconnect()
      })

      if (disconnected) {
        console.warn('[GS] port disconnected synchronously')
        this._onFailedConnect()
        return
      }

      console.log('[GS] port connected (attempts:', this._reconnectAttempts, ')')
      this._reconnectAttempts = 0

      this.send({
        type: 'GS_READY',
        url: location.href,
        title: document.title,
      })
    },

    _onFailedConnect: function () {
      this._reconnectAttempts++
      this._scheduleReconnect()
    },

    _scheduleReconnect: function () {
      var self = this
      clearTimeout(this._reconnectTimer)

      var delay = this._reconnectAttempts < this._reconnectDelays.length
        ? this._reconnectDelays[this._reconnectAttempts]
        : this._maxReconnectDelay

      console.log('[GS] scheduling reconnect in', delay, 'ms (attempt', this._reconnectAttempts, ')')
      this._reconnectTimer = setTimeout(function () {
        console.log('[GS] attempting reconnect...')
        self.init()
      }, delay)
    },

    onMessage: function (handler) {
      this._messageHandlers.push(handler)
    },

    send: function (data) {
      if (!this._port) {
        console.warn('[GS] no port, dropping message:', data.type)
        return
      }
      try {
        this._port.postMessage(data)
        console.log('[GS] sent:', data.type)
      } catch (e) {
        console.error('[GS] postMessage error:', e)
        this._port = null
        this._scheduleReconnect()
      }
    },

    sendToDashboard: function (data) {
      this.send(data)
    },
  }

  // ---- Extraction queue (sérialise les extractions pour éviter les conflits DOM) ----
  var extractionQueue = Promise.resolve()

  // ---- Extractors ----
  function extractImages() {
    var result = []
    var seen = new Set()

    document.querySelectorAll('img[src]').forEach(function (el) {
      var src = el.getAttribute('src') || el.currentSrc || el.src
                || el.getAttribute('data-src') || el.getAttribute('data-lazy')
                || el.getAttribute('data-original') || ''
      var resolved = GS.SelectorTools.resolveUrl(src)
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved)
        var attrs = {}
        if (el.attributes) {
          Array.from(el.attributes).forEach(function (attr) {
            attrs[attr.name] = attr.value
          })
        }
        result.push({
          src: resolved,
          alt: el.getAttribute('alt') || '',
          width: el.naturalWidth || null,
          height: el.naturalHeight || null,
          type: 'img',
          html: el.outerHTML.trim().slice(0, 1000),
          attrs: attrs,
          tag: el.tagName.toLowerCase(),
        })
      }
    })

    document.querySelectorAll('picture source[srcset]').forEach(function (el) {
      var srcset = el.getAttribute('srcset')
      if (srcset) {
        var first = srcset.split(',')[0].trim().split(' ')[0]
        var resolved = GS.SelectorTools.resolveUrl(first)
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved)
          result.push({ src: resolved, alt: '', type: 'picture' })
        }
      }
    })

    var bgElements = document.querySelectorAll('div, section, header, footer, main, article, aside, figure, span, a, li')
    bgElements.forEach(function (el) {
      var style = window.getComputedStyle(el)
      var bg = style.backgroundImage
      if (bg && bg !== 'none') {
        var match = bg.match(/url\(["']?([^"')]+)["']?\)/)
        if (match) {
          var resolved = GS.SelectorTools.resolveUrl(match[1])
          if (resolved && !seen.has(resolved)) {
            seen.add(resolved)
            result.push({ src: resolved, alt: '', type: 'background' })
          }
        }
      }
    })

    return result
  }

  function extractHeadings() {
    var result = {}
    ;['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(function (tag) {
      result[tag] = Array.from(document.querySelectorAll(tag))
        .map(function (el) { return el.textContent.trim() })
        .filter(Boolean)
    })
    return result
  }

  function extractLinks() {
    return Array.from(document.querySelectorAll('a'))
      .map(function (el) {
        var href = el.getAttribute('href')
        var attrs = {}
        if (el.attributes) {
          Array.from(el.attributes).forEach(function (attr) {
            attrs[attr.name] = attr.value
          })
        }
        return {
          text: el.textContent.trim().slice(0, 500),
          html: el.innerHTML.trim().slice(0, 1000),
          attrs: attrs,
          tag: el.tagName.toLowerCase(),
          href: href,
          resolvedUrl: href ? new URL(href, document.baseURI).href : null,
          isInternal: href ? href.startsWith('/') || href.startsWith(location.origin) || !href.startsWith('http') : null,
        }
      })
  }

  function extractParagraphs() {
    return Array.from(document.querySelectorAll('p'))
      .map(function (el) { return el.textContent.trim() })
      .filter(Boolean)
  }

  function extractLists() {
    return Array.from(document.querySelectorAll('ul, ol')).map(function (el) {
      return {
        type: el.tagName.toLowerCase(),
        items: Array.from(el.querySelectorAll(':scope > li')).map(function (li) {
          return li.textContent.trim()
        }).filter(Boolean),
      }
    }).filter(function (list) { return list.items.length > 0 })
  }

  function extractTables() {
    return Array.from(document.querySelectorAll('table')).map(function (table) {
      var headers = []
      var captionEl = table.querySelector('caption')
      var caption = captionEl ? captionEl.textContent.trim() : ''

      var headerRow = table.querySelector('thead tr, tr:first-child')
      if (headerRow) {
        headers = Array.from(headerRow.querySelectorAll('th, td')).map(function (th) {
          return th.textContent.trim()
        })
      }

      var rows = Array.from(table.querySelectorAll('tbody tr, tbody > tr, tr')).map(function (tr) {
        if (tr === headerRow) return null
        return Array.from(tr.querySelectorAll('td, th')).map(function (td) {
          return td.textContent.trim()
        })
      }).filter(Boolean)

      return { caption: caption, headers: headers, rows: rows }
    }).filter(function (t) { return t.rows.length > 0 })
  }

  function extractMetadata() {
    var result = {}

    result.title = document.title

    var metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) result.description = metaDesc.getAttribute('content')

    result.og = {}
    document.querySelectorAll('meta[property^="og:"]').forEach(function (el) {
      var prop = el.getAttribute('property').slice(3)
      result.og[prop] = el.getAttribute('content')
    })

    result.twitter = {}
    document.querySelectorAll('meta[name^="twitter:"]').forEach(function (el) {
      var name = el.getAttribute('name').slice(8)
      result.twitter[name] = el.getAttribute('content')
    })

    var keywords = document.querySelector('meta[name="keywords"]')
    if (keywords) result.keywords = keywords.getAttribute('content')

    return result
  }

  function extractStructuredData() {
    var result = []

    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
      try {
        var parsed = JSON.parse(el.textContent)
        result.push({ type: 'json-ld', data: parsed })
      } catch (e) {}
    })

    var items = document.querySelectorAll('[itemscope][itemtype]')
    if (items.length > 0) {
      result.push({
        type: 'microdata',
        count: items.length,
        examples: Array.from(items).slice(0, 5).map(function (el) {
          return {
            type: el.getAttribute('itemtype'),
            props: Array.from(el.querySelectorAll('[itemprop]')).map(function (prop) {
              return { name: prop.getAttribute('itemprop'), value: (prop.textContent || '').trim().slice(0, 100) }
            }),
          }
        }),
      })
    }

    return result
  }

  function extractDataTypes(types) {
    var data = {}
    data.url = location.href
    data.title = document.title

    if (types.indexOf('images') !== -1) data.images = extractImages()
    if (types.indexOf('headings') !== -1) data.headings = extractHeadings()
    if (types.indexOf('links') !== -1) data.links = extractLinks()
    if (types.indexOf('paragraphs') !== -1) data.paragraphs = extractParagraphs()
    if (types.indexOf('lists') !== -1) data.lists = extractLists()
    if (types.indexOf('tables') !== -1) data.tables = extractTables()
    if (types.indexOf('metadata') !== -1) data.metadata = extractMetadata()
    if (types.indexOf('structured') !== -1) data.structured = extractStructuredData()

    return data
  }

  // ---- extractCssSelectors ----
  function extractCssSelectors(selectors) {
    var results = []

    selectors.forEach(function (item) {
      var label = item.label || item.selector
      var selector = item.selector
      if (!selector) return

      var elements = document.querySelectorAll(selector)
      var items = Array.from(elements).map(function (el) {
        var attrs = {}
        if (el.attributes) {
          Array.from(el.attributes).forEach(function (attr) {
            attrs[attr.name] = attr.value
          })
        }
        var href = el.getAttribute('href')
        return {
          text: el.textContent.trim().slice(0, 500),
          html: el.innerHTML.trim().slice(0, 1000),
          attrs: attrs,
          tag: el.tagName.toLowerCase(),
          href: href,
          resolvedUrl: href ? new URL(href, document.baseURI).href : null,
          isInternal: href ? href.startsWith('/') || href.startsWith(location.origin) || !href.startsWith('http') : null,
        }
      })

      results.push({
        label: label,
        selector: selector,
        count: items.length,
        items: items,
      })
    })

    return { selectors: results }
  }

  // ---- Image Fetch (for download) ----
  async function fetchImagesAsBase64(images) {
    var result = {}
    for (var i = 0; i < images.length; i++) {
      var img = images[i]
      if (!img.src) continue
      try {
        var resp = await fetch(img.src, { mode: 'cors' })
        if (!resp.ok) continue
        var blob = await resp.blob()
        var ext = blob.type.split('/')[1] || 'jpg'
        var name = 'image-' + String(i + 1).padStart(3, '0') + '.' + ext
        var b64 = await blobToBase64(blob)
        result[name] = b64.split(',')[1]
      } catch (e) {
        console.warn('[GS] failed to fetch image:', img.src)
      }
    }
    return result
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader()
      reader.onloadend = function () { resolve(reader.result) }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // ---- extractFullPage (full-page mode) ----
  function extractFullPage() {
    var data = {}

    data.url = location.href
    data.title = document.title

    var metaDesc = document.querySelector('meta[name="description"]')
    data.metaDescription = metaDesc ? metaDesc.getAttribute('content') : ''

    data.headings = {}
    ;['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(function (tag) {
      data.headings[tag] = Array.from(document.querySelectorAll(tag))
        .map(function (el) { return el.textContent.trim() })
        .filter(Boolean)
    })

    data.paragraphs = Array.from(document.querySelectorAll('p'))
      .map(function (el) { return el.textContent.trim() })
      .filter(Boolean)

    data.links = extractLinks()

    data.images = extractImages()

    return data
  }

  // ---- waitAndScroll ----
  function waitAndScroll(delay, scrollEnabled) {
    return new Promise(function (resolve) {
      if (delay > 0) {
        setTimeout(function () {
          if (scrollEnabled) autoScroll(resolve)
          else resolve()
        }, delay * 1000)
      } else if (scrollEnabled) {
        autoScroll(resolve)
      } else {
        resolve()
      }
    })
  }

  function autoScroll(resolve) {
    var maxSteps = 30
    var step = window.innerHeight
    var steps = 0
    var prevHeight = document.body.scrollHeight

    function scroll() {
      window.scrollBy(0, step)
      steps++
      setTimeout(function () {
        var h = document.body.scrollHeight
        if (h > prevHeight) {
          prevHeight = h
          if (steps < maxSteps) scroll()
          else resolve()
        } else if (window.innerHeight + window.scrollY >= h) {
          resolve()
        } else {
          if (steps < maxSteps) scroll()
          else resolve()
        }
      }, 400)
    }

    scroll()
  }

  // ---- Message Handlers ----
  GS.MessagingService.onMessage(function (msg) {
    console.log('[GS] message recu:', msg.type)

    if (msg.type === 'TRIGGER_EXTRACTION') {
      extractionQueue = extractionQueue.then(function () {
        return (async function () {
          try {
            var options = msg.options || {}
            await waitAndScroll(options.delay || 0, options.scroll || false)

            if (msg.modeId === 'full-page') {
              var data = extractFullPage()
              GS.MessagingService.send({
                type: 'EXTRACTION_RESULT',
                modeId: 'full-page',
                data: data,
              })
              console.log('[GS] full-page extraction sent:', Object.keys(data))
            }

            if (msg.modeId === 'data-types') {
              var types = msg.types || []
              var data = extractDataTypes(types)
              GS.MessagingService.send({
                type: 'EXTRACTION_RESULT',
                modeId: 'data-types',
                data: data,
              })
              console.log('[GS] data-types extraction sent:', types)
            }

            if (msg.modeId === 'css-selector') {
              var selectors = msg.selectors || []
              var data = extractCssSelectors(selectors)
              GS.MessagingService.send({
                type: 'EXTRACTION_RESULT',
                modeId: 'css-selector',
                data: data,
              })
              console.log('[GS] css-selector extraction sent:', selectors.length, 'selectors')
            }
          } catch (e) {
            console.error('[GS] Extraction failed:', e)
            GS.MessagingService.send({
              type: 'EXTRACTION_ERROR',
              modeId: msg.modeId,
              error: e.message || 'Unknown error',
            })
          }
        })()
      })
      return
    }

    if (msg.type === 'DOWNLOAD_IMAGES') {
      console.log('[GS] fetching', msg.images.length, 'images...')
      fetchImagesAsBase64(msg.images).then(function (images) {
        GS.MessagingService.send({
          type: 'IMAGES_BASE64',
          images: images,
        })
        console.log('[GS] images sent:', Object.keys(images).length)
      })
    }

    if (msg.type === 'GET_HTML') {
      console.log('[GS] fetching HTML structure...')
      GS.MessagingService.send({
        type: 'HTML_STRUCTURE',
        html: document.documentElement.outerHTML,
      })
    }

    if (msg.type === 'TEST_SELECTOR') {
      var selector = msg.selector
      var testId = msg.testId
      var elements = document.querySelectorAll(selector)
      var preview = Array.from(elements).slice(0, 5).map(function (el) {
        return { text: (el.textContent || '').trim().slice(0, 80), tag: el.tagName.toLowerCase() }
      })
      GS.MessagingService.send({
        type: 'SELECTOR_TEST_RESULT',
        testId: testId,
        selector: selector,
        count: elements.length,
        preview: preview,
      })
    }
  })

  // ---- Init ----
  try {
    GS.MessagingService.init()
    console.log('[GS] initialization complete')
  } catch (e) {
    console.error('[GS] initialization failed:', e)
  }
})()
