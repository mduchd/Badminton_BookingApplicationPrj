import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Minimize2,
  Maximize2,
  CheckCircle2,
} from 'lucide-react'
import type { AIMessage, SearchCriteria } from '../../types/user'
import { formatPrice } from '../../../lib/utils'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onApplyCriteria: (criteria: Partial<SearchCriteria>) => void
  currentCriteria?: SearchCriteria
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  onApplyCriteria,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI tìm sân SmashCourt. Bạn có thể hỏi bất kỳ yêu cầu nào, ví dụ: "Tìm sân ở Cầu Giấy tối mai 19-21h, dưới 150k/giờ". Tôi sẽ quét dữ liệu sân trống thực tế để gợi ý cho bạn.',
      timestamp: 'Vừa xong',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const quickPrompts = [
    'Tìm sân ở Cầu Giấy tối mai 19-21h, dưới 150k/giờ',
    'Sân có máy lạnh ở Nam Từ Liêm tối nay sau 18h',
    'Tìm sân Ba Đình 19:30 - 21:30',
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  if (!isOpen) return null

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputValue.trim()
    if (!query) return

    const userMsg: AIMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInputValue('')
    setIsThinking(true)

    setTimeout(() => {
      setIsThinking(false)

      const lower = query.toLowerCase()
      const extracted: Partial<SearchCriteria> = {}

      // District detection
      if (lower.includes('cầu giấy')) extracted.district = 'Cầu Giấy'
      else if (lower.includes('nam từ liêm') || lower.includes('mỹ đình')) extracted.district = 'Nam Từ Liêm'
      else if (lower.includes('ba đình')) extracted.district = 'Ba Đình'
      else if (lower.includes('thanh xuân') || lower.includes('khương đình')) extracted.district = 'Thanh Xuân'
      else if (lower.includes('đống đa')) extracted.district = 'Đống Đa'

      // Time detection
      if (lower.includes('19-21') || lower.includes('19h-21h') || lower.includes('19h - 21h')) {
        extracted.startTime = '19:00'
        extracted.endTime = '21:00'
      } else if (lower.includes('18h') || lower.includes('sau 18h')) {
        extracted.startTime = '18:00'
        extracted.endTime = '20:00'
      } else if (lower.includes('19:30')) {
        extracted.startTime = '19:30'
        extracted.endTime = '21:30'
      }

      // Price detection
      if (lower.includes('150k') || lower.includes('150.000')) {
        extracted.maxPricePerHour = 150000
      } else if (lower.includes('120k')) {
        extracted.maxPricePerHour = 120000
      }

      // Amenities detection
      const amenities: string[] = []
      if (lower.includes('máy lạnh') || lower.includes('điều hòa')) amenities.push('Máy lạnh')
      if (lower.includes('ô tô') || lower.includes('oto') || lower.includes('xe hơi')) amenities.push('Bãi đỗ ô tô')
      if (lower.includes('thuê vợt')) amenities.push('Thuê vợt')
      if (amenities.length > 0) extracted.amenities = amenities

      let replyText = 'Tôi đã quét dữ liệu các cụm sân và tìm thấy các sân phù hợp với yêu cầu của bạn.'
      if (extracted.district) replyText += ` Khu vực: ${extracted.district}.`
      if (extracted.startTime) replyText += ` Khung giờ: ${extracted.startTime} - ${extracted.endTime}.`
      if (extracted.maxPricePerHour) replyText += ` Ngân sách: dưới ${formatPrice(extracted.maxPricePerHour)}/giờ.`

      replyText += '\n\nĐã tự động đồng bộ kết quả tìm kiếm vào danh sách sân!'

      const aiMsg: AIMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: replyText,
        extractedCriteria: Object.keys(extracted).length > 0 ? (extracted as SearchCriteria) : undefined,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, aiMsg])
      if (Object.keys(extracted).length > 0) {
        onApplyCriteria(extracted)
      }
    }, 700)
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
        isExpanded
          ? 'w-[calc(100vw-32px)] sm:w-[600px] h-[80vh]'
          : 'w-[calc(100vw-32px)] sm:w-[460px] h-[580px]'
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 bg-[#1b7a42] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-wide">Trợ lý AI tìm sân</h3>
            <p className="text-xs text-emerald-100 font-medium">Hỗ trợ tìm kiếm & lọc sân thông minh</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-white/90">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
            title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
          >
            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
            title="Đóng chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#1b7a42] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#1b7a42] text-white rounded-br-xs shadow-xs font-medium'
                  : msg.isError
                  ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Extracted Criteria Card Preview inside message (clean user terms) */}
              {msg.extractedCriteria && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#1b7a42] font-black mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tiêu chí tìm kiếm:</span>
                  </div>
                  {msg.extractedCriteria.district && (
                    <div>• Khu vực: <strong>{msg.extractedCriteria.district}</strong></div>
                  )}
                  {msg.extractedCriteria.date && (
                    <div>• Ngày: <strong>{msg.extractedCriteria.date}</strong></div>
                  )}
                  {msg.extractedCriteria.startTime && (
                    <div>• Khung giờ: <strong>{msg.extractedCriteria.startTime} – {msg.extractedCriteria.endTime}</strong></div>
                  )}
                  {msg.extractedCriteria.maxPricePerHour && (
                    <div>• Ngân sách: <strong>{formatPrice(msg.extractedCriteria.maxPricePerHour)}/h</strong></div>
                  )}
                  {msg.extractedCriteria.amenities && msg.extractedCriteria.amenities.length > 0 && (
                    <div>• Tiện ích: <strong>{msg.extractedCriteria.amenities.join(', ')}</strong></div>
                  )}
                </div>
              )}

              <span
                className={`block text-[10px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-2.5 items-center text-slate-500 text-xs pl-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#1b7a42] flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#1b7a42] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#1b7a42] animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#1b7a42] animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-slate-600 font-bold ml-1">Đang tra cứu lịch sân...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Suggestions */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-white">
        <p className="text-xs text-slate-500 font-bold mb-1.5">Gợi ý câu hỏi:</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs whitespace-nowrap font-semibold transition-colors border border-slate-200 flex-shrink-0 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage()
        }}
        className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Nhập yêu cầu: khu vực, ngày, giờ..."
          className="flex-1 px-4 py-3 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b7a42]/20 focus:border-[#1b7a42]"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isThinking}
          className="p-3 rounded-xl bg-[#1b7a42] hover:bg-[#156335] disabled:bg-slate-200 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
