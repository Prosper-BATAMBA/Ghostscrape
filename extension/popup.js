;(function () {
  var statusBadge = document.getElementById('statusBadge')
  var connectionDot = document.getElementById('connectionDot')
  var connectionText = document.getElementById('connectionText')
  var tabInfo = document.getElementById('tabInfo')

  function updateUI(status) {
    if (status.connected) {
      statusBadge.className = 'badge connected'
      statusBadge.textContent = 'ON'
      connectionDot.className = 'dot green'
      connectionText.textContent = 'Connected to server'
    } else {
      statusBadge.className = 'badge disconnected'
      statusBadge.textContent = 'OFF'
      connectionDot.className = 'dot red'
      connectionText.textContent = 'Disconnected'
    }
    tabInfo.textContent = 'Active tabs: ' + (status.tabCount || 0)
  }

  function refresh() {
    chrome.runtime.sendMessage({ type: 'CONNECTION_STATUS' }, function (resp) {
      if (resp) updateUI(resp)
      else updateUI({ connected: false, tabCount: 0 })
    })
  }

  document.getElementById('reconnectBtn').addEventListener('click', function () {
    chrome.runtime.sendMessage({ type: 'RECONNECT' })
    connectionDot.className = 'dot amber'
    connectionText.textContent = 'Reconnecting...'
    setTimeout(refresh, 1500)
  })

  refresh()
})()
