import { useState } from 'react'

export default function useModeEngine() {
  var [activeMode, setActiveMode] = useState(null)
  var [modeData, setModeData] = useState({})
  var [imageBlobs, setImageBlobs] = useState(null)
  var [htmlStructure, setHtmlStructure] = useState(null)
  var [extractionOptions, setExtractionOptions] = useState({ delay: 0, scroll: false })
  var [testResults, setTestResults] = useState({})

  var handleMessage = function (msg) {
    switch (msg.type) {
      case 'MODE_ACTIVATED':
        setActiveMode(msg.modeId)
        break
      case 'DEACTIVATE_MODE':
        setActiveMode(null)
        break
      case 'EXTRACTION_RESULT':
        setModeData({ type: msg.type, modeId: msg.modeId, data: msg.data })
        setImageBlobs(null)
        setHtmlStructure(null)
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

  return {
    activeMode, setActiveMode,
    modeData, setModeData,
    imageBlobs,
    htmlStructure,
    extractionOptions, setExtractionOptions,
    testResults, setTestResults,
    handleMessage,
  }
}
