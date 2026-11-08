import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  Bot,
  User,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Mic,
  MicOff,
  MapPin,
  Clock,
  Calendar,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AIMessage, SearchCriteria } from '../../types/user'
import type { BadmintonCourtItem } from '../mockData'
import { formatPrice } from '../../../lib/utils'
import { authStorage } from '../auth/authApi'
import { optimizeVietnameseSpeech, pickBestAlternative } from './vietnameseSpeechOptimizer'
import { API_BASE_URL as API_ROOT_URL } from '../../../lib/apiConfig'

const API_BASE_URL = `${API_ROOT_URL}/v1`

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onApplyCriteria: (criteria: Partial<SearchCriteria>) => void
  onSelectCourt?: (court: BadmintonCourtItem) => void
  onBookCourt?: (court: BadmintonCourtItem) => void
  currentCriteria?: SearchCriteria
}

// Clean markdown bold and strip all asterisks (*)
function renderFormattedLine(line: string, isUser: boolean) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2).replace(/\*/g, '')
      return (
        <strong
          key={i}
          className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}
        >
          {boldText}
        </strong>
      )
    }
    const cleanText = part.replace(/\*/g, '')
    return <span key={i}>{cleanText}</span>
  })
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  onApplyCriteria,
  currentCriteria,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI SmashCourt 🏸\n\nBạn có thể hỏi tôi bất kỳ điều gì:\n- Tìm sân & đặt lịch: "Tìm sân Cầu Giấy tối mai sau 19h, dưới 150k/h"\n- Tư vấn trang bị: "Người mới nên chọn vợt 3U hay 4U?"\n- Luật thi đấu: "Luật giao cầu 1.15m & luật tính điểm 21"\n- Chính sách: "Chính sách giữ chỗ 10 phút & hoàn hủy sân"',
      timestamp: 'Vừa xong',
      followUpChips: [
        'Tìm sân Cầu Giấy tối nay',
        'Sân có máy lạnh dưới 150k',
        'Tư vấn chọn vợt 3U hay 4U',
        'Luật giao cầu BWF mới nhất',
        'Chính sách giữ chỗ 10 phút',
      ],
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [audioLevels, setAudioLevels] = useState<number[]>([8, 14, 24, 18, 12, 16, 10])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const intentionalStopRef = useRef<boolean>(false)
  const restartCountRef = useRef<number>(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SILENCE_TIMEOUT_MS = 8000
  const MAX_AUTO_RESTARTS = 10

  const quickPrompts = [
    'Tìm sân Cầu Giấy tối nay sau 19h',
    'Sân có máy lạnh dưới 150k/h',
    'Tư vấn chọn vợt 3U hay 4U',
    'Luật giao cầu BWF 1.15m',
    'Chính sách hoàn hủy sân',
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // Clean up all audio streams and speech recognition on unmount
  useEffect(() => {
    return () => {
      intentionalStopRef.current = true
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close() } catch { /* ignore */ }
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
      }
    }
  }, [])

  // Reset silence timer mỗi khi có kết quả mới
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      const rawCombined = (finalTranscriptRef.current).trim()
      if (rawCombined) {
        handleStopVoice(true)
      } else {
        handleStopVoice(false)
      }
    }, SILENCE_TIMEOUT_MS)
  }

  const handleStopVoice = (shouldSend = false) => {
    intentionalStopRef.current = true
    restartCountRef.current = 0

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch { /* ignore */ }
      audioCtxRef.current = null
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
    setAudioLevels([8, 14, 24, 18, 12, 16, 10])

    const rawCombined = (finalTranscriptRef.current + ' ' + liveTranscript).trim() || inputValue.trim()
    const textToSubmit = optimizeVietnameseSpeech(rawCombined)
    finalTranscriptRef.current = ''
    if (shouldSend && textToSubmit) {
      handleSendMessage(textToSubmit)
    }
    setLiveTranscript('')
  }

  const handleStartVoice = async () => {
    try {
      intentionalStopRef.current = false
      restartCountRef.current = 0

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 16000, max: 48000 },
        },
      })
      mediaStreamRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx({ sampleRate: 16000 })
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.75
        analyser.minDecibels = -90
        analyser.maxDecibels = -10
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateWave = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)

          const sampleIndices = [2, 5, 9, 14, 20, 28, 36]
          const levels = sampleIndices.map((idx) => {
            const raw = dataArray[idx] || 0
            return Math.max(6, Math.min(32, Math.round((raw / 255) * 32)))
          })
          setAudioLevels(levels)
          animFrameRef.current = requestAnimationFrame(updateWave)
        }
        updateWave()
      }

      setIsListening(true)
      setLiveTranscript('')

      finalTranscriptRef.current = ''
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'vi-VN'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 5

        recognition.onresult = (event: any) => {
          resetSilenceTimer()
          restartCountRef.current = 0

          let interim = ''
          let currentFinal = finalTranscriptRef.current

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i]
            const alts: Array<{ transcript: string; confidence?: number }> = []
            for (let a = 0; a < res.length; a++) {
              if (res[a]?.transcript) {
                alts.push({
                  transcript: res[a].transcript,
                  confidence: res[a].confidence,
                })
              }
            }
            const bestPiece = pickBestAlternative(alts)

            if (res.isFinal) {
              currentFinal += bestPiece + ' '
              finalTranscriptRef.current = currentFinal
            } else {
              interim += bestPiece
            }
          }

          const rawCombined = (currentFinal + interim).trim()
          const optimized = optimizeVietnameseSpeech(rawCombined)
          if (optimized) {
            setLiveTranscript(optimized)
            setInputValue(optimized)
          }
        }

        recognition.onend = () => {
          if (!intentionalStopRef.current && restartCountRef.current < MAX_AUTO_RESTARTS) {
            restartCountRef.current += 1
            try {
              recognition.start()
            } catch {
              handleStopVoice(false)
            }
          }
        }

        recognition.onerror = (event: any) => {
          const errType = event.error
          console.warn('SpeechRecognition error:', errType)

          if (errType === 'not-allowed' || errType === 'service-not-allowed') {
            toast.error('Vui lòng cấp quyền Microphone trên trình duyệt để nói.')
            handleStopVoice(false)
          } else if (errType === 'audio-capture') {
            toast.error('Không thể thu âm. Kiểm tra microphone của bạn.')
            handleStopVoice(false)
          } else if (errType === 'network') {
            toast.error('Lỗi kết nối mạng. Vui lòng kiểm tra internet.')
            handleStopVoice(false)
          }
        }

        recognition.start()
        recognitionRef.current = recognition
        resetSilenceTimer()

        toast.info('Đang lắng nghe... Nói tự nhiên, chữ sẽ xuất hiện ngay!')
      } else {
        toast.info('Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.')
        handleStopVoice(false)
      }
    } catch (err) {
      console.warn('Microphone access error:', err)
      toast.error('Không thể truy cập Microphone. Vui lòng cho phép quyền truy cập thiết bị!')
      setIsListening(false)
    }
  }

  // Toggle Voice Recognition
  const handleToggleVoice = () => {
    if (isListening) {
      handleStopVoice(false)
    } else {
      handleStartVoice()
    }
  }

  if (!isOpen) return null



  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue.trim()
    if (!query) return

    // Stop voice if running
    if (isListening) {
      handleStopVoice(false)
    }

    const userMsg: AIMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInputValue('')
    setIsThinking(true)

    try {
      const token = authStorage.getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/ai/search`, {
        method: 'POST', headers,
        body: JSON.stringify({
          message: query,
          currentCriteria: currentCriteria ? {
            district: currentCriteria.district || null,
            startTime: currentCriteria.startTime || null,
            endTime: currentCriteria.endTime || null,
            maxPricePerHour: currentCriteria.maxPricePerHour ?? null,
            amenities: currentCriteria.amenities || [],
          } : null,
        }),
      })
      if (!res.ok) throw new Error('Không thể xử lý yêu cầu')
      const body = await res.json()
      if (!body.success || !body.data) throw new Error('Không thể xử lý yêu cầu')
      const data = body.data
      const criteria: Partial<SearchCriteria> = {}
      for (const key of ['district', 'startTime', 'endTime', 'maxPricePerHour', 'amenities'] as const) {
        if (data.extractedCriteria?.[key] != null) (criteria as Record<string, unknown>)[key] = data.extractedCriteria[key]
      }
      setMessages((prev) => [...prev, {
        id: 'ai_' + Date.now(), sender: 'ai',
        text: data.recommendedCourts?.length === 0 && (criteria.district || criteria.maxPricePerHour || criteria.amenities?.length)
          ? `${data.reply}\n\nKhông tìm thấy sân phù hợp trong dữ liệu hiện có.` : data.reply,
        extractedCriteria: Object.keys(criteria).length ? criteria : undefined,
        recommendedCourts: data.recommendedCourts || [],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }])
      if (Object.keys(criteria).length) onApplyCriteria(criteria)
    } catch {
      setMessages((prev) => [...prev, {
        id: 'ai_' + Date.now(), sender: 'ai', isError: true,
        text: 'Không thể kết nối trợ lý lúc này. Vui lòng thử lại sau.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center transition-all duration-300 ${
        isExpanded ? 'p-0' : 'p-3 sm:p-5'
      }`}
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs pointer-events-auto overlay-enter"
        onClick={onClose}
      />

      {/* Centered Floating Chat Panel with Smooth Enter Animation & Fullscreen Mode */}
      <div
        className={`relative pointer-events-auto bg-white overflow-hidden flex flex-col transition-all duration-300 ${
          isExpanded
            ? 'w-full h-full sm:w-full sm:h-full rounded-none border-0 shadow-none'
            : 'w-full max-w-xl sm:max-w-2xl h-[86vh] sm:h-[680px] max-h-[min(90vh,760px)] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 modal-enter'
        }`}
      >
        {/* Header - Flat, solid, high contrast */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-white border-b border-slate-100 shrink-0">
          <div className={`flex items-center justify-between gap-3 ${isExpanded ? 'max-w-5xl mx-auto w-full' : ''}`}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#168039] text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-normal truncate">
                  Trợ lý AI SmashCourt
                </h3>
                <p className="text-xs text-slate-600 font-medium truncate">
                  Tìm sân, tư vấn trang bị & giải đáp luật chơi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isExpanded ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
                aria-label={isExpanded ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
              >
                {isExpanded ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng chat"
                aria-label="Đóng chat"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Voice Soundwave Visualizer Banner */}
        {isListening && (
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200/90 shrink-0">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isExpanded ? 'max-w-5xl mx-auto w-full' : ''}`}>
              {/* Soundwave bars & live listening status */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Dynamic Soundwave Bars reacting to actual microphone volume */}
                <div className="flex items-center gap-1 h-9 px-2.5 py-1 bg-white rounded-xl border border-emerald-300 shrink-0 select-none">
                  {audioLevels.map((lvl, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 rounded-full bg-[#168039] transition-all duration-75"
                      style={{ height: `${Math.max(6, Math.min(30, lvl))}px` }}
                    />
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#168039]">Đang nhận diện giọng nói:</span>
                    <span className="text-[11px] text-slate-500 font-medium truncate">
                      {liveTranscript ? 'Hiển thị tức thì thời gian thực' : 'Hãy nói câu lệnh (chữ sẽ hiện ngay)...'}
                    </span>
                  </div>
                  <div className="mt-0.5 min-h-[20px] flex items-center">
                    {liveTranscript ? (
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                        "{liveTranscript}"
                        <span className="inline-block w-1.5 h-3 bg-[#168039] ml-1 align-middle" />
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        Đang chờ âm thanh tiếng Việt...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleStopVoice(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hoàn tất và gửi yêu cầu"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Xong &amp; Gửi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStopVoice(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  title="Hủy thu âm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Thread */}
        <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4 bg-slate-50">
          <div className={`space-y-4 ${isExpanded ? 'max-w-4xl mx-auto w-full' : ''}`}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 fade-in-item ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#168039] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-3.5 py-3 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#168039] text-white rounded-br-xs font-medium'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-bl-xs'
                    : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-line font-normal space-y-1">
                  {msg.text.split('\n').map((line, idx) => {
                    if (!line.trim()) return <div key={idx} className="h-1" />
                    return (
                      <p key={idx} className="leading-relaxed">
                        {renderFormattedLine(line, msg.sender === 'user')}
                      </p>
                    )
                  })}
                </div>

                {/* Extracted Criteria Card Preview inside message */}
                {msg.extractedCriteria && Object.keys(msg.extractedCriteria).length > 0 && (
                  <div className="mt-3 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#168039] font-black mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Bộ lọc đã áp dụng vào trang:</span>
                    </div>
                    {msg.extractedCriteria.district && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Khu vực: <strong>{msg.extractedCriteria.district}</strong></span>
                      </div>
                    )}
                    {msg.extractedCriteria.date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Ngày chơi: <strong>{msg.extractedCriteria.date}</strong></span>
                      </div>
                    )}
                    {msg.extractedCriteria.startTime && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Khung giờ: <strong>{msg.extractedCriteria.startTime} – {msg.extractedCriteria.endTime}</strong></span>
                      </div>
                    )}
                    {msg.extractedCriteria.maxPricePerHour && (
                      <div>
                        Giá: <strong>dưới {formatPrice(msg.extractedCriteria.maxPricePerHour)}/h</strong>
                      </div>
                    )}
                    {msg.extractedCriteria.amenities && msg.extractedCriteria.amenities.length > 0 && (
                      <div>
                        Tiện ích: <strong>{msg.extractedCriteria.amenities.join(', ')}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Court Cards inside AI message */}
                {msg.recommendedCourts && msg.recommendedCourts.length > 0 && (
                  <div className="mt-3.5 space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                      <span>Cụm sân gợi ý phù hợp nhất:</span>
                      <span className="text-[#168039] font-bold">{msg.recommendedCourts.length} sân</span>
                    </div>

                    {msg.recommendedCourts.map((court) => (
                      <div key={court.facilityId} className="border border-slate-200 rounded-lg p-3">
                        <p className="font-bold text-slate-900">{court.facilityName}</p>
                        <p className="text-slate-700 mt-1">{court.address}</p>
                        <p className="text-slate-700 mt-1">Giờ mở cửa: {court.openHours}</p>
                        <p className="text-slate-700 mt-1">{court.minPricePerHour != null ? `Giá từ ${formatPrice(court.minPricePerHour)}/h` : 'Chưa có bảng giá'}</p>
                        <p className="text-slate-700 mt-1">{court.matchReason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dynamic Contextual Follow-up Chips under AI message */}
                {msg.followUpChips && msg.followUpChips.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <p className="text-[10px] text-slate-500 font-bold mb-1.5">Gợi ý câu hỏi tiếp theo:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followUpChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#168039] border border-emerald-200/90 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span
                  className={`block text-[10px] mt-1.5 text-right font-medium ${
                    msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-2.5 items-center text-slate-600 text-xs pl-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#168039] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl">
                <span className="w-2 h-2 rounded-full bg-[#168039] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#168039] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#168039] animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-700 font-bold ml-1">Đang phân tích yêu cầu...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Quick Prompts Strip */}
        <div className="px-3.5 sm:px-6 py-2 border-t border-slate-100 bg-white shrink-0">
          <div className={`flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs whitespace-nowrap font-bold transition-colors border border-slate-200/80 shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form with Speech Recognition & Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0"
        >
          <div className={`flex items-center gap-2 ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}>
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-50 border-rose-300 text-rose-600 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title={isListening ? 'Dừng ghi âm' : 'Nói yêu cầu bằng giọng nói'}
            aria-label="Ghi âm giọng nói"
          >
            {isListening ? <MicOff className="w-5 h-5 text-rose-600" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Đang nói... chữ hiển thị trực tiếp ở đây' : 'Nhập: khu vực, giờ, hỏi luật hay chọn vợt...'}
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168039]/20 focus:border-[#168039]"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isThinking}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
          </div>
        </form>
      </div>
    </div>
  )
}
