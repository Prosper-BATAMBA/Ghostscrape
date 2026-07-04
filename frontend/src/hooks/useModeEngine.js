import { useState } from 'react'

export default function useModeEngine() {
  var [activeMode, setActiveMode] = useState(null)
  var [modeData, setModeData] = useState({})
  var [imageBlobs, setImageBlobs] = useState(null)
  var [htmlStructure, setHtmlStructure] = useState(null)
  var [extractionOptions, setExtractionOptions] = useState({ delay: 0, scroll: false })
  var [testResults, setTestResults] = useState({})
  var [extractionState, setExtractionState] = useState('idle')

  var handleMessage = function (msg) {
    switch (msg.type) {
      case 'MODE_ACTIVATED':
        setActiveMode(msg.modeId)
        break
      case 'DEACTIVATE_MODE':
        setActiveMode(null)
        break
      case 'TRIGGER_EXTRACTION':
        setExtractionState('extracting')
        break
      case 'EXTRACTION_RESULT':
        setModeData({ type: msg.type, modeId: msg.modeId, data: msg.data })
        setExtractionState('done')
        setImageBlobs(null)
        setHtmlStructure(null)
        break
      case 'EXTRACTION_ERROR':
        setExtractionState('error')
        setModeData({ type: msg.type, modeId: msg.modeId, error: msg.error })
        break
      case 'EXTRACTION_CANCELLED':
        setExtractionState('cancelled')
        setModeData({ type: msg.type, modeId: msg.modeId })
        break
      case 'IMAGES_BASE64':
        setImageBlobs(msg.images)
        break
      case 'HTML_STRUCTURE':
        setHtmlStructure(msg.html)
        break
      case 'SELECTOR_TEST_RESULT':
        setTestResults(function (prev) { return { ...prev, [msg.testId]: { count: msg.count, preview: msg.preview, selector: msg.selector } } })
        break
      default:
        setModeData({ type: msg.type, ...msg })
    }
  }

  function triggerExtraction(send, msg) {
    setExtractionState('extracting')
    setModeData({})
    send({ type: 'TRIGGER_EXTRACTION', ...msg })
  }

  function cancelExtraction(send) {
    setExtractionState('cancelling')
    send({ type: 'CANCEL_EXTRACTION' })
  }

  function resetExtraction() {
    setExtractionState('idle')
    setModeData({})
  }

  return {
    activeMode, setActiveMode,
    modeData, setModeData,
    imageBlobs,
    htmlStructure,
    extractionOptions, setExtractionOptions,
    testResults, setTestResults,
    extractionState,
    handleMessage,
    triggerExtraction,
    cancelExtraction,
    resetExtraction,
  }
}
