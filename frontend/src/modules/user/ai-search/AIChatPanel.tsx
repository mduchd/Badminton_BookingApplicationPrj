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
  Star,
  Clock,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AIMessage, SearchCriteria } from '../../types/user'
import type { BadmintonCourtItem } from '../mockData'
import { formatPrice } from '../../../lib/utils'
import { authStorage } from '../auth/authApi'
import { parseUserQuery } from './aiKnowledgeAndParser'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onApplyCriteria: (criteria: Partial<SearchCriteria>) => void
  onSelectCourt?: (court: BadmintonCourtItem) => void
  onBookCourt?: (court: BadmintonCourtItem) => void
  currentCriteria?: SearchCriteria
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  onApplyCriteria,
  onSelectCourt,
  onBookCourt,
  currentCriteria,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI SmashCourt 🏸\n\nBạn có thể hỏi tôi bất kỳ điều gì:\n- **Tìm sân & đặt lịch:** "Tìm sân Cầu Giấy tối mai sau 19h, dưới 150k/h"\n- **Tư vấn trang bị:** "Người mới nên chọn vợt 3U hay 4U?"\n- **Luật thi đấu:** "Luật giao cầu 1.15m & luật tính điểm 21"\n- **Chính sách:** "Chính sách giữ chỗ 10 phút & hoàn hủy sân"',
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

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

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.lang = 'vi-VN'
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript
          if (transcript) {
            setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript))
            toast.success(`Đã nhận diện giọng nói: "${transcript}"`)
          }
        }

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error)
          setIsListening(false)
          if (event.error === 'not-allowed') {
            toast.error('Vui lòng cấp quyền truy cập Microphone trên trình duyệt để nói.')
          }
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      } catch (err) {
        console.warn('Could not initialize SpeechRecognition:', err)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  if (!isOpen) return null

  // Toggle Voice Recognition
  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      toast.info('Trình duyệt hiện tại chưa hỗ trợ Web Speech API. Vui lòng nhập bằng văn bản.')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        toast.info('Đang lắng nghe... Hãy nói yêu cầu của bạn bằng tiếng Việt!')
      } catch {
        setIsListening(false)
      }
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue.trim()
    if (!query) return

    // Stop speech if running
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
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

    // Parse with smart client-side knowledge & NLP first
    const clientResult = parseUserQuery(query, currentCriteria)

    // 1. Try real Backend AI Orchestrator
    try {
      const token = authStorage.getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${API_BASE_URL}/ai/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: query,
          conversationId: 'conv_' + Date.now(),
          currentCriteria,
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          const aiData = body.data
          const criteria = aiData.extractedCriteria || clientResult.extractedCriteria || {}

          const aiMsg: AIMessage = {
            id: 'ai_' + Date.now(),
            sender: 'ai',
            text: aiData.reply || clientResult.replyText,
            extractedCriteria: Object.keys(criteria).length > 0 ? (criteria as SearchCriteria) : undefined,
            recommendedCourts: clientResult.recommendedCourts,
            followUpChips: clientResult.followUpChips,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          }

          setMessages((prev) => [...prev, aiMsg])
          if (Object.keys(criteria).length > 0) {
            onApplyCriteria(criteria)
          }
          setIsThinking(false)
          return
        }
      }
    } catch {
      // Graceful fallback to rich local NLP engine below
    }

    // 2. Client-side NLP fallback with 600ms latency simulation
    setTimeout(() => {
      setIsThinking(false)

      const aiMsg: AIMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: clientResult.replyText,
        extractedCriteria: clientResult.extractedCriteria,
        recommendedCourts: clientResult.recommendedCourts,
        followUpChips: clientResult.followUpChips,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, aiMsg])
      if (clientResult.extractedCriteria && Object.keys(clientResult.extractedCriteria).length > 0) {
        onApplyCriteria(clientResult.extractedCriteria)
      }
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex sm:items-end sm:justify-end items-end justify-center p-0 sm:p-4">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs pointer-events-auto overlay-enter"
        onClick={onClose}
      />

      {/* Floating Chat Panel with Smooth Enter Animation */}
      <div
        className={`relative pointer-events-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 max-sm:sheet-enter sm:panel-slide-in-right ${
          isExpanded
            ? 'w-full sm:w-[680px] h-[90vh] sm:h-[84vh]'
            : 'w-full sm:w-[500px] h-[82vh] sm:h-[620px]'
        }`}
      >
        {/* Header - Flat, solid, high contrast */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#168039] text-white flex items-center justify-center shrink-0">
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

          <div className="flex items-center gap-1 text-slate-500 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Listening Voice Indicator Banner */}
        {isListening && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200/80 flex items-center justify-between gap-2 text-xs font-bold text-[#168039] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Đang lắng nghe giọng nói... Hãy nói yêu cầu của bạn!</span>
            </div>
            <button
              type="button"
              onClick={handleToggleVoice}
              className="text-xs font-bold underline cursor-pointer hover:text-emerald-800"
            >
              Dừng lại
            </button>
          </div>
        )}

        {/* Messages Thread */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 bg-slate-50">
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
                    // Quick bold formatting helper
                    if (!line.trim()) return <div key={idx} className="h-1" />
                    return (
                      <p key={idx} className="leading-relaxed">
                        {line}
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
                      <div
                        key={court.id}
                        className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 hover:border-emerald-600 transition-colors flex flex-col gap-2.5"
                      >
                        <div className="flex gap-2.5">
                          <img
                            src={court.imageUrl}
                            alt={court.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shrink-0 border border-slate-100"
                          />
                          <div className="min-w-0 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {court.name}
                              </h4>
                              <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{court.district} • {court.distance}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{court.rating || 4.8}</span>
                              </div>
                              <span className="text-xs sm:text-sm font-black text-[#168039]">
                                {formatPrice(court.pricePerHour)}/h
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons inside card */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          {onSelectCourt && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCourt(court)
                              }}
                              className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Xem chi tiết</span>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          )}
                          {onBookCourt && (
                            <button
                              type="button"
                              onClick={() => {
                                onBookCourt(court)
                                onClose()
                              }}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3 h-3 text-white" />
                              <span>Đặt ngay</span>
                            </button>
                          )}
                        </div>
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

        {/* Bottom Quick Prompts Strip */}
        <div className="px-3.5 py-2 border-t border-slate-100 bg-white shrink-0">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
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
            placeholder={isListening ? 'Đang lắng nghe... Hãy nói yêu cầu' : 'Nhập: khu vực, giờ, hỏi luật hay chọn vợt...'}
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
        </form>
      </div>
    </div>
  )
}
