;(function () {
  if (window.__gs_initialized) return
  if (location.origin === 'http://localhost:3000' || location.origin === 'https://localhost:3000' || location.origin === 'http://localhost:8000') return
  window.__gs_initialized = true

  console.log('[GS] content script loaded — inline mode')

  window.GS = window.GS || {}

  // ---- Image element map (for DOM-based image extraction) ----
  var imageElementMap = {}

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

  // ---- PageDetector (détection pages bloquées/erreur) ----
  GS.PageDetector = {
    _blockedPatterns: [
      /access.?denied/i, /403 forbidden/i, /404 not found/i,
      /too many requests/i, /rate.?limited/i, /blocked/i,
      /captcha/i, /cf.?challenge/i, /ddos.?protection/i,
      /just a moment/i, /checking your browser/i,
      /your request has been blocked/i, /security.?check/i,
      /attention required/i, /cloudflare/i,
    ],

    detect: function () {
      var body = document.body ? document.body.innerText : ''
      var html = document.documentElement ? document.documentElement.innerHTML : ''
      var title = document.title
      var status = this._getHttpStatus()
      var checks = []

      if (status && status >= 400) {
        checks.push({ type: 'http_status', detail: String(status), severity: 'high' })
      }

      this._blockedPatterns.forEach(function (pattern) {
        if (pattern.test(body) || pattern.test(html) || pattern.test(title)) {
          checks.push({
            type: 'content_pattern',
            detail: pattern.source,
            severity: pattern.source.toLowerCase().includes('403') || pattern.source.toLowerCase().includes('access') ? 'high' : 'medium',
          })
        }
      })

      if (body.trim().length < 50 && !this._hasUsefulContent()) {
        checks.push({ type: 'empty_page', detail: 'Page body has fewer than 50 chars of text', severity: 'medium' })
      }

      return {
        blocked: checks.some(function (c) { return c.severity === 'high' }),
        suspicious: checks.some(function (c) { return c.severity === 'medium' }),
        checks: checks,
      }
    },

    _getHttpStatus: function () {
      try {
        if (performance && performance.getEntriesByType) {
          var entries = performance.getEntriesByType('navigation')
          if (entries.length > 0) return entries[0].responseStatus
        }
      } catch (e) {}
      return null
    },

    _hasUsefulContent: function () {
      var selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'article', 'main', 'section', 'table', 'img', 'a']
      for (var i = 0; i < selectors.length; i++) {
        if (document.querySelector(selectors[i])) return true
      }
      return false
    },
  }

  // ---- RetryManager (réessai avec backoff progressif) ----
  GS.RetryManager = {
    defaults: { maxRetries: 3, baseDelay: 500, maxDelay: 5000, factor: 2 },

    retry: function (fn, options) {
      var opts = {}
      for (var k in this.defaults) opts[k] = this.defaults[k]
      if (options) { for (var k in options) opts[k] = options[k] }

      return new Promise(function (resolve, reject) {
        var attempt = 0
        function run() {
          attempt++
          var result
          try { result = fn() } catch (e) { return reject(e) }

          if (result && typeof result.then === 'function') {
            result.then(function (val) {
              if (opts.validate && !opts.validate(val) && attempt <= opts.maxRetries) {
                var delay = Math.min(opts.baseDelay * Math.pow(opts.factor, attempt - 1), opts.maxDelay)
                console.log('[GS] Retry attempt ' + attempt + '/' + opts.maxRetries + ' in ' + delay + 'ms')
                setTimeout(run, delay)
              } else {
                resolve(val)
              }
            }).catch(function (err) {
              if (attempt <= opts.maxRetries) {
                var delay = Math.min(opts.baseDelay * Math.pow(opts.factor, attempt - 1), opts.maxDelay)
                console.log('[GS] Retry after error (attempt ' + attempt + '/' + opts.maxRetries + ') in ' + delay + 'ms:', err.message)
                setTimeout(run, delay)
              } else {
                reject(err)
              }
            })
          } else {
            if (opts.validate && !opts.validate(result) && attempt <= opts.maxRetries) {
              var delay = Math.min(opts.baseDelay * Math.pow(opts.factor, attempt - 1), opts.maxDelay)
              console.log('[GS] Retry attempt ' + attempt + '/' + opts.maxRetries + ' in ' + delay + 'ms')
              setTimeout(run, delay)
            } else {
              resolve(result)
            }
          }
        }
        run()
      })
    },
  }

  // ---- Timeout wrapper ----
  GS.Timeout = function (promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error((label || 'Operation') + ' timed out after ' + ms + 'ms'))
      }, ms)
      promise.then(function (v) { clearTimeout(timer); resolve(v) })
             .catch(function (e) { clearTimeout(timer); reject(e) })
    })
  }

  // ---- waitForSelector (MutationObserver) ----
  GS.waitForSelector = function (selector, timeout) {
    timeout = timeout || 10000
    return new Promise(function (resolve, reject) {
      var found = document.querySelectorAll(selector)
      if (found.length > 0) return resolve(found)

      var timer = setTimeout(function () {
        observer.disconnect()
        reject(new Error('waitForSelector timed out: ' + selector))
      }, timeout)

      var observer = new MutationObserver(function () {
        var els = document.querySelectorAll(selector)
        if (els.length > 0) {
          clearTimeout(timer)
          observer.disconnect()
          resolve(els)
        }
      })

      observer.observe(document.documentElement, {
        childList: true, subtree: true, attributes: false,
      })
    })
  }

  // ---- Extraction queue (sérialise les extractions pour éviter les conflits DOM) ----
  var extractionQueue = Promise.resolve()

  // ---- Extractors ----
  function extractImages() {
    var result = []
    var seen = new Set()
    imageElementMap = {}

    document.querySelectorAll('img[src]').forEach(function (el) {
      var src = el.getAttribute('src') || el.currentSrc || el.src
                || el.getAttribute('data-src') || el.getAttribute('data-lazy')
                || el.getAttribute('data-original') || ''
      var resolved = GS.SelectorTools.resolveUrl(src)
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved)
        imageElementMap[resolved] = el
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
      var name = 'image-' + String(i + 1).padStart(3, '0')
      var b64 = null

      // Try 1: existing <img> already in the DOM (no new request, bypasses Cloudflare)
      try {
        b64 = await domImageToBase64(img.src)
      } catch (_) {}

      // Try 2: create a new Image() element
      if (!b64) {
        try {
          b64 = await newImageToBase64(img.src)
        } catch (_) {
          console.warn('[GS] newImage failed for:', img.src)
        }
      }

      // Try 3: fallback to fetch() (works for CDNs with CORS)
      if (!b64) {
        try {
          var resp = await fetch(img.src, { mode: 'cors' })
          if (resp.ok) {
            var blob = await resp.blob()
            var ext = blob.type.split('/')[1] || 'jpg'
            name += '.' + ext
            b64 = await blobToBase64(blob)
            b64 = b64.split(',')[1]
          }
        } catch (e) {
          console.warn('[GS] fetch failed for:', img.src)
        }
      }

      if (b64) {
        if (name.indexOf('.') === -1) name += '.png'
        result[name] = b64
      }
    }
    return result
  }

  function domImageToBase64(src) {
    var el = imageElementMap[src]
    if (!el || !el.complete || !el.naturalWidth) return null
    try {
      var canvas = document.createElement('canvas')
      canvas.width = el.naturalWidth
      canvas.height = el.naturalHeight
      var ctx = canvas.getContext('2d')
      ctx.drawImage(el, 0, 0)
      return canvas.toDataURL('image/png').split(',')[1]
    } catch (e) { return null }
  }

  async function newImageToBase64(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image()
      img.onload = function () {
        try {
          var canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          var ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png').split(',')[1])
        } catch (e) { reject(e) }
      }
      img.onerror = function () {
        reject(new Error('img load failed'))
      }
      img.src = url
    })
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

  // ---- Cancellation support ----
  var _extractionCancelled = false
  var _cancelToken = 0

  function _checkCancelled() {
    if (_extractionCancelled) {
      var err = new Error('Extraction cancelled by user')
      err.name = 'CancelledError'
      throw err
    }
  }

  function _resetCancellation() {
    _extractionCancelled = false
    _cancelToken++
  }

  // ---- Default extraction options ----
  var defaultExtractionOptions = {
    timeout: 30000,
    retryEnabled: true,
    retryMax: 3,
    retryBaseDelay: 500,
    checkBlocked: true,
  }

  // ---- Message Handlers ----
  GS.MessagingService.onMessage(function (msg) {
    console.log('[GS] message recu:', msg.type)

    if (msg.type === 'SET_OPTIONS') {
      if (msg.options) {
        for (var k in msg.options) defaultExtractionOptions[k] = msg.options[k]
      }
      return
    }

    if (msg.type === 'CANCEL_EXTRACTION') {
      _extractionCancelled = true
      console.log('[GS] Extraction cancelled by user')
      return
    }

    if (msg.type === 'DETECT_BLOCKED') {
      var detection = GS.PageDetector.detect()
      GS.MessagingService.send({
        type: 'BLOCKED_DETECTION_RESULT',
        blocked: detection.blocked,
        suspicious: detection.suspicious,
        checks: detection.checks,
      })
      return
    }

    if (msg.type === 'WAIT_FOR_SELECTOR') {
      var sel = msg.selector
      var waitTimeout = msg.timeout || 10000
      GS.waitForSelector(sel, waitTimeout).then(function (elements) {
        GS.MessagingService.send({
          type: 'WAIT_FOR_SELECTOR_RESULT',
          selector: sel,
          count: elements.length,
          found: true,
        })
      }).catch(function (err) {
        GS.MessagingService.send({
          type: 'WAIT_FOR_SELECTOR_RESULT',
          selector: sel,
          count: 0,
          found: false,
          error: err.message,
        })
      })
      return
    }

    if (msg.type === 'TRIGGER_EXTRACTION') {
      _resetCancellation()
      var currentToken = _cancelToken

      extractionQueue = extractionQueue.then(function () {
        return (async function () {
          try {
            var options = msg.options || {}
            var timeout = options.timeout || defaultExtractionOptions.timeout

            var extractionPromise = (async function () {
              _checkCancelled()

              if (defaultExtractionOptions.checkBlocked !== false && options.checkBlocked !== false) {
                var detection = GS.PageDetector.detect()
                if (detection.blocked) {
                  GS.MessagingService.send({
                    type: 'EXTRACTION_WARNING',
                    modeId: msg.modeId,
                    warning: 'blocked_page',
                    detail: 'Page appears to be blocked or restricted',
                    checks: detection.checks,
                  })
                }
              }

              _checkCancelled()

              await waitAndScroll(options.delay || 0, options.scroll || false)

              _checkCancelled()

              if (msg.modeId === 'full-page') {
                var data = extractFullPage()
                _checkCancelled()
                GS.MessagingService.send({
                  type: 'EXTRACTION_RESULT',
                  modeId: 'full-page',
                  data: data,
                })
                console.log('[GS] full-page extraction sent:', Object.keys(data))
              }

              if (msg.modeId === 'data-types') {
                var types = msg.types || []
                _checkCancelled()
                var doExtract = function () { _checkCancelled(); return extractDataTypes(types) }
                var validateFn = function (d) {
                  for (var i = 0; i < types.length; i++) {
                    if (d[types[i]] && (Array.isArray(d[types[i]]) ? d[types[i]].length > 0 : Object.keys(d[types[i]]).length > 0)) return true
                  }
                  return false
                }
                var data
                if (defaultExtractionOptions.retryEnabled && options.retry !== false) {
                  data = await GS.Timeout(
                    GS.RetryManager.retry(doExtract, {
                      maxRetries: options.retryMax || defaultExtractionOptions.retryMax,
                      baseDelay: options.retryBaseDelay || defaultExtractionOptions.retryBaseDelay,
                      validate: validateFn,
                    }),
                    timeout, 'data-types extraction'
                  )
                } else {
                  data = await GS.Timeout(Promise.resolve(doExtract()), timeout, 'data-types extraction')
                }
                _checkCancelled()
                GS.MessagingService.send({
                  type: 'EXTRACTION_RESULT',
                  modeId: 'data-types',
                  data: data,
                })
                console.log('[GS] data-types extraction sent:', types)
              }

              if (msg.modeId === 'css-selector') {
                var selectors = msg.selectors || []
                _checkCancelled()
                var doExtract = function () { _checkCancelled(); return extractCssSelectors(selectors) }
                var validateFn = function (d) {
                  return d.selectors.some(function (s) { return s.count > 0 })
                }
                var data
                if (defaultExtractionOptions.retryEnabled && options.retry !== false) {
                  data = await GS.Timeout(
                    GS.RetryManager.retry(doExtract, {
                      maxRetries: options.retryMax || defaultExtractionOptions.retryMax,
                      baseDelay: options.retryBaseDelay || defaultExtractionOptions.retryBaseDelay,
                      validate: validateFn,
                    }),
                    timeout, 'css-selector extraction'
                  )
                } else {
                  data = await GS.Timeout(Promise.resolve(doExtract()), timeout, 'css-selector extraction')
                }
                _checkCancelled()
                GS.MessagingService.send({
                  type: 'EXTRACTION_RESULT',
                  modeId: 'css-selector',
                  data: data,
                })
                console.log('[GS] css-selector extraction sent:', selectors.length, 'selectors')
              }
            })()

            return GS.Timeout(extractionPromise, timeout, msg.modeId + ' extraction')
          } catch (e) {
            if (e.name === 'CancelledError') {
              console.log('[GS] Extraction cancelled')
              GS.MessagingService.send({
                type: 'EXTRACTION_CANCELLED',
                modeId: msg.modeId,
              })
            } else {
              console.error('[GS] Extraction failed:', e)
              GS.MessagingService.send({
                type: 'EXTRACTION_ERROR',
                modeId: msg.modeId,
                error: e.message || 'Unknown error',
              })
            }
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
