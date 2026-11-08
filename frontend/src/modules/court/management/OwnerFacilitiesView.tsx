import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Edit2,
  Upload,
  Clock,
  Phone,
  MapPin,
  Trash2,
  Check,
  X,
  Image as ImageIcon,
  Search,
  Layers,
  Power,
  ExternalLink,
} from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { LocationMapPicker } from './LocationMapPicker'
import { courtApi } from '../services/courtApi'
import { standardizeVietnameseAddress } from '../../../lib/facilityLocation'
import type {
  CourtUpsertPayload,
  Facility,
  FacilityUpsertPayload,
  SubCourt,
} from '../../types/court'
import { toast } from 'sonner'

const PRESET_AMENITIES = [
  'Máy lạnh',
  'Thảm tiêu chuẩn BWF',
  'Đèn LED chống chói',
  'Bãi đỗ ô tô',
  'Giữ xe máy miễn phí',
  'Tắm nóng lạnh',
  'Thuê vợt',
  'Bán nước & cầu',
  'Căng vợt lấy ngay',
  'Wifi miễn phí',
  'Tủ đồ cá nhân',
  'HLV hướng dẫn',
]

const CITY_OPTIONS = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Đồng Nai',
  'Bà Rịa - Vũng Tàu',
  'Khánh Hòa',
  'Đắk Lắk',
  'Cần Thơ',
  'Kiên Giang',
  'Hải Dương',
  'Bắc Giang',
  'Hưng Yên',
  'Phú Thọ',
  'Quảng Bình',
  'Quảng Trị',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Long An',
]

type ModalSection = 'general' | 'map' | 'amenities' | 'media' | 'settings'

interface FacilityFormState {
  id?: string
  isNew: boolean
  name: string
  city: string
  district: string
  ward: string
  streetAddress: string
  latitude: number
  longitude: number
  openTime: string
  closeTime: string
  isOpen24Hours: boolean
  primaryPhone: string
  primaryPhoneNote: string
  secondaryPhone: string
  secondaryPhoneNote: string
  phone: string
  description: string
  logoUrl: string
  imageUrl: string
  galleryImages: string[]
  amenities: string[]
  sportType: 'badminton'
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  draftCourts: CourtUpsertPayload[]
  enableOnlineBooking: boolean
  allowOneTime: boolean
  allowSchedule: boolean
  allowSocial: boolean
  allowMembership: boolean
  bankName: string
  bankAccountNumber: string
  bankAccountHolder: string
  autoFillQrAmount: boolean
  requireQrDeposit: boolean
  onlineBookingNote: string
}

function parseMultiPhoneState(rawPhone: string): {
  primaryPhone: string
  primaryPhoneNote: string
  secondaryPhone: string
  secondaryPhoneNote: string
} {
  const parts = (rawPhone || '')
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
  const parsePart = (part?: string) => {
    if (!part) return { num: '', note: '' }
    const idx = part.indexOf('-')
    if (idx === -1) return { num: part.trim(), note: '' }
    return {
      num: part.slice(0, idx).trim(),
      note: part.slice(idx + 1).trim(),
    }
  }
  const p1 = parsePart(parts[0])
  const p2 = parsePart(parts[1])
  return {
    primaryPhone: p1.num,
    primaryPhoneNote: p1.note,
    secondaryPhone: p2.num,
    secondaryPhoneNote: p2.note,
  }
}

function composeMultiPhoneString(state: {
  primaryPhone: string
  primaryPhoneNote: string
  secondaryPhone: string
  secondaryPhoneNote: string
}): string {
  const entries: string[] = []
  if (state.primaryPhone.trim()) {
    entries.push(
      state.primaryPhoneNote.trim()
        ? `${state.primaryPhone.trim()} - ${state.primaryPhoneNote.trim()}`
        : state.primaryPhone.trim()
    )
  }
  if (state.secondaryPhone.trim()) {
    entries.push(
      state.secondaryPhoneNote.trim()
        ? `${state.secondaryPhone.trim()} - ${state.secondaryPhoneNote.trim()}`
        : state.secondaryPhone.trim()
    )
  }
  return entries.join(' | ')
}

export const OwnerFacilitiesView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'paused'>('all')

  // Facility Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<ModalSection>('general')
  const [formState, setFormState] = useState<FacilityFormState | null>(null)
  const [savingFacility, setSavingFacility] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [customAmenity, setCustomAmenity] = useState('')
  const [manualImageUrl, setManualImageUrl] = useState('')
  const [bulkCourtCount, setBulkCourtCount] = useState<number>(6)
  const [bulkCourtPrice, setBulkCourtPrice] = useState<number>(100000)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Sub-court Modal State (for existing facility quick CRUD)
  const [courtModalTarget, setCourtModalTarget] = useState<{
    facilityId: string
    facilityName: string
    editingCourt?: SubCourt
  } | null>(null)
  const [courtForm, setCourtForm] = useState<CourtUpsertPayload>({
    name: 'Sân 1 - Thảm BWF',
    courtNumber: 1,
    courtType: 'STANDARD',
    basePricePerHour: 110000,
    surfaceType: 'Thảm PVC tiêu chuẩn BWF',
    description: '',
    status: 'ACTIVE',
  })
  const [savingCourt, setSavingCourt] = useState(false)

  // Embedded Map Preview Modal for any Facility card
  const [mapPreviewFacility, setMapPreviewFacility] = useState<Facility | null>(null)

  const loadFacilities = async () => {
    setLoading(true)
    try {
      const data = await courtApi.getOwnerFacilities()
      setFacilities(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách cụm sân')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFacilities()
  }, [])

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase()
        const hit =
          f.name.toLowerCase().includes(kw) ||
          f.address.toLowerCase().includes(kw) ||
          f.district.toLowerCase().includes(kw) ||
          f.city.toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
  }, [facilities, searchKeyword, statusFilter])

  const liveNormalizedAddress = useMemo(() => {
    if (!formState) return ''
    return standardizeVietnameseAddress({
      streetAddress: formState.streetAddress,
      ward: formState.ward,
      district: formState.district,
      city: formState.city,
    })
  }, [formState?.streetAddress, formState?.ward, formState?.district, formState?.city])

  const handleOpenCreateModal = () => {
    setFormState({
      isNew: true,
      name: '',
      city: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      streetAddress: '',
      latitude: 21.0313,
      longitude: 105.7831,
      openTime: '05:00',
      closeTime: '24:00',
      isOpen24Hours: false,
      primaryPhone: '0866866368',
      primaryPhoneNote: 'Gọi khi đặt lịch vãng lai / Chốt lịch qua Zalo',
      secondaryPhone: '0364059999',
      secondaryPhoneNote: 'Gọi khi đặt lịch cố định / Khiếu nại dịch vụ',
      phone: '0866866368 - Gọi khi đặt lịch vãng lai / Chốt lịch qua Zalo | 0364059999 - Gọi khi đặt lịch cố định / Khiếu nại dịch vụ',
      description:
        'Cụm sân thảm tiêu chuẩn thi đấu BWF, trần cao thoáng mát, hệ thống chiếu sáng chống chói và đầy đủ dịch vụ tiện ích.',
      logoUrl: '/images/logos/badminton-club-logo.svg',
      imageUrl: '/images/venues/hn-bmc-1.jpg',
      galleryImages: [
        '/images/venues/hn-bmc-1.jpg',
        '/images/venues/hn-bmc-2.jpg',
        '/images/venues/hn-bmc-3.jpg',
      ],
      amenities: ['Máy lạnh', 'Thảm tiêu chuẩn BWF', 'Đèn LED chống chói', 'Bãi đỗ ô tô', 'Bán nước & cầu'],
      sportType: 'badminton',
      status: 'ACTIVE',
      draftCourts: Array.from({ length: 6 }, (_, idx) => ({
        name: `Sân ${idx + 1}`,
        courtNumber: idx + 1,
        courtType: 'STANDARD' as const,
        basePricePerHour: 100000,
        surfaceType: 'Thảm PVC tiêu chuẩn BWF',
        status: 'ACTIVE' as const,
      })),
      enableOnlineBooking: true,
      allowOneTime: true,
      allowSchedule: true,
      allowSocial: true,
      allowMembership: true,
      bankName: 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
      bankAccountNumber: '1234567890',
      bankAccountHolder: 'CLB CAU LONG SMASHCOURT',
      autoFillQrAmount: true,
      requireQrDeposit: true,
      onlineBookingNote:
        'Khách đặt lịch online vui lòng chuyển khoản cọc theo mã QR tự động để hệ thống giữ sân ngay lập tức.',
    })
    setBulkCourtCount(6)
    setBulkCourtPrice(100000)
    setActiveSection('general')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (fac: Facility) => {
    const [openT = '05:00', closeT = '24:00'] = (fac.openHours || '05:00 - 24:00')
      .split('-')
      .map((s) => s.trim())
    const parsedPhones = parseMultiPhoneState(fac.phone || '')
    const is24h =
      (fac.openTime || openT) === '00:00' &&
      ((fac.closeTime || closeT) === '24:00' || (fac.closeTime || closeT) === '23:59')

    setFormState({
      id: fac.id,
      isNew: false,
      name: fac.name,
      city: fac.city || 'Hà Nội',
      district: fac.district || '',
      ward: fac.ward || '',
      streetAddress: fac.streetAddress || fac.address.split(',')[0]?.trim() || '',
      latitude: fac.latitude || 21.0285,
      longitude: fac.longitude || 105.8542,
      openTime: fac.openTime || openT,
      closeTime: fac.closeTime || closeT,
      isOpen24Hours: is24h,
      primaryPhone: parsedPhones.primaryPhone,
      primaryPhoneNote: parsedPhones.primaryPhoneNote,
      secondaryPhone: parsedPhones.secondaryPhone,
      secondaryPhoneNote: parsedPhones.secondaryPhoneNote,
      phone: fac.phone || '',
      description: fac.description || '',
      logoUrl: fac.logoUrl || '/images/logos/badminton-club-logo.svg',
      imageUrl: fac.imageUrl,
      galleryImages: fac.galleryImages.length > 0 ? [...fac.galleryImages] : [fac.imageUrl],
      amenities: [...fac.amenities],
      sportType: 'badminton',
      status:
        fac.status === 'maintenance'
          ? 'MAINTENANCE'
          : fac.status === 'paused' || fac.status === 'inactive'
          ? 'INACTIVE'
          : 'ACTIVE',
      draftCourts: [],
      enableOnlineBooking: fac.status === 'active',
      allowOneTime: true,
      allowSchedule: true,
      allowSocial: true,
      allowMembership: true,
      bankName: 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
      bankAccountNumber: '21510008899999',
      bankAccountHolder: 'CHU SAN CAU LONG',
      autoFillQrAmount: true,
      requireQrDeposit: true,
      onlineBookingNote:
        'Vui lòng mang giày đế kếp chuyên dụng cầu lông và có mặt trước 10 phút để nhận sân.',
    })
    setActiveSection('general')
    setIsModalOpen(true)
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0 || !formState) return
    setUploadingLogo(true)
    try {
      const uploaded = await courtApi.uploadImages([fileList[0]])
      if (uploaded[0]?.url) {
        setFormState({
          ...formState,
          logoUrl: uploaded[0].url,
        })
        toast.success('Đã cập nhật Logo thương hiệu chi nhánh (tỷ lệ 1:1)!')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải logo thất bại')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleGenerateBulkCourts = () => {
    if (!formState) return
    const count = Math.max(1, Math.min(30, Number(bulkCourtCount) || 1))
    const price = Math.max(20000, Number(bulkCourtPrice) || 100000)
    const generated: CourtUpsertPayload[] = Array.from({ length: count }, (_, idx) => ({
      name: `Sân ${idx + 1}`,
      courtNumber: idx + 1,
      courtType: 'STANDARD',
      basePricePerHour: price,
      surfaceType: 'Thảm PVC tiêu chuẩn BWF',
      status: 'ACTIVE',
    }))
    setFormState({
      ...formState,
      draftCourts: generated,
    })
    toast.success(`Đã khởi tạo tự động danh sách ${count} sân con (Sân 1 -> Sân ${count})!`)
  }

  const handleToggleAmenity = (amenity: string) => {
    if (!formState) return
    const exists = formState.amenities.includes(amenity)
    setFormState({
      ...formState,
      amenities: exists
        ? formState.amenities.filter((a) => a !== amenity)
        : [...formState.amenities, amenity],
    })
  }

  const handleAddCustomAmenity = () => {
    if (!formState || !customAmenity.trim()) return
    const trimmed = customAmenity.trim()
    if (!formState.amenities.includes(trimmed)) {
      setFormState({
        ...formState,
        amenities: [...formState.amenities, trimmed],
      })
    }
    setCustomAmenity('')
  }

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0 || !formState) return
    const files = Array.from(fileList)
    setUploadingFiles(true)
    try {
      const uploaded = await courtApi.uploadImages(files)
      const urls = uploaded.map((u) => u.url)
      const merged = [...formState.galleryImages]
      urls.forEach((u) => {
        if (!merged.includes(u)) merged.push(u)
      })
      setFormState({
        ...formState,
        imageUrl: formState.imageUrl || urls[0] || '',
        logoUrl: formState.logoUrl || urls[0] || '',
        galleryImages: merged,
      })
      toast.success(`Đã tải lên ${uploaded.length} ảnh thành công!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải ảnh thất bại')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddManualImageUrl = () => {
    if (!formState || !manualImageUrl.trim()) return
    const url = manualImageUrl.trim()
    if (!formState.galleryImages.includes(url)) {
      setFormState({
        ...formState,
        imageUrl: formState.imageUrl || url,
        galleryImages: [...formState.galleryImages, url],
      })
    }
    setManualImageUrl('')
  }

  const handleRemoveGalleryImage = (url: string) => {
    if (!formState) return
    const nextGallery = formState.galleryImages.filter((u) => u !== url)
    setFormState({
      ...formState,
      galleryImages: nextGallery,
      imageUrl: formState.imageUrl === url ? nextGallery[0] || '' : formState.imageUrl,
    })
  }

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState) return
    if (!formState.name.trim() || !formState.district.trim()) {
      toast.error('Vui lòng nhập đầy đủ Tên chi nhánh và Quận/Huyện.')
      return
    }
    if (!formState.primaryPhone.trim() && !formState.phone.trim()) {
      toast.error('Số điện thoại liên hệ không được bỏ trống!')
      return
    }
    if (
      formState.enableOnlineBooking &&
      (!formState.bankName.trim() || !formState.bankAccountNumber.trim())
    ) {
      toast.error(
        'Không thể bật đặt lịch online vì chưa có thông tin tài khoản ngân hàng nhận thanh toán!'
      )
      setActiveSection('settings')
      return
    }

    const composedPhone =
      composeMultiPhoneString({
        primaryPhone: formState.primaryPhone,
        primaryPhoneNote: formState.primaryPhoneNote,
        secondaryPhone: formState.secondaryPhone,
        secondaryPhoneNote: formState.secondaryPhoneNote,
      }) || formState.phone.trim()

    const effectiveOpenTime = formState.isOpen24Hours ? '00:00' : formState.openTime
    const effectiveCloseTime = formState.isOpen24Hours ? '24:00' : formState.closeTime

    setSavingFacility(true)
    try {
      const payload: FacilityUpsertPayload = {
        name: formState.name.trim(),
        city: formState.city.trim(),
        district: formState.district.trim(),
        ward: formState.ward.trim(),
        streetAddress: formState.streetAddress.trim(),
        address: liveNormalizedAddress,
        latitude: formState.latitude,
        longitude: formState.longitude,
        openTime: effectiveOpenTime,
        closeTime: effectiveCloseTime,
        phone: composedPhone,
        description: formState.description.trim(),
        logoUrl: formState.logoUrl || '/images/logos/badminton-club-logo.svg',
        imageUrl: formState.imageUrl || formState.galleryImages[0],
        galleryImages: formState.galleryImages,
        amenities: formState.amenities,
        sportType: formState.sportType,
        status: formState.enableOnlineBooking ? formState.status : 'INACTIVE',
        courts: formState.isNew ? formState.draftCourts : undefined,
      }

      if (formState.isNew) {
        await courtApi.createFacility(payload)
        toast.success('Đã khởi tạo chi nhánh và danh sách sân con thành công!')
      } else if (formState.id) {
        await courtApi.updateFacility(formState.id, payload)
        toast.success('Cập nhật thông tin và cài đặt chi nhánh thành công!')
      }
      setIsModalOpen(false)
      await loadFacilities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu cụm sân thất bại')
    } finally {
      setSavingFacility(false)
    }
  }

  const handleToggleFacilityStatus = async (fac: Facility) => {
    const nextStatus = fac.status === 'active' ? 'MAINTENANCE' : 'ACTIVE'
    try {
      await courtApi.updateFacilityStatus(fac.id, nextStatus)
      toast.success(
        nextStatus === 'ACTIVE'
          ? `Đã mở hoạt động trở lại cho ${fac.name}`
          : `Đã chuyển ${fac.name} sang chế độ bảo trì`
      )
      loadFacilities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đổi trạng thái cụm sân')
    }
  }

  const handleDeleteFacility = async (fac: Facility) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hoặc ngừng vận hành cơ sở "${fac.name}"?`)) return
    try {
      await courtApi.deleteFacility(fac.id)
      toast.info(`Đã ngừng vận hành cơ sở ${fac.name}`)
      loadFacilities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa cụm sân')
    }
  }

  // ==================== SUB-COURT QUICK CRUD ====================

  const handleOpenAddSubCourt = (fac: Facility) => {
    const nextNum = fac.subCourts.length + 1
    setCourtModalTarget({ facilityId: fac.id, facilityName: fac.name })
    setCourtForm({
      name: `Sân ${nextNum} - Tiêu chuẩn BWF`,
      courtNumber: nextNum,
      courtType: 'STANDARD',
      basePricePerHour: fac.pricePerHour || 110000,
      surfaceType: 'Thảm PVC tiêu chuẩn BWF',
      description: '',
      status: 'ACTIVE',
    })
  }

  const handleOpenEditSubCourt = (fac: Facility, court: SubCourt) => {
    setCourtModalTarget({
      facilityId: fac.id,
      facilityName: fac.name,
      editingCourt: court,
    })
    setCourtForm({
      name: court.name,
      courtNumber: court.courtNumber || 1,
      courtType: court.courtType.toUpperCase() as CourtUpsertPayload['courtType'],
      basePricePerHour: court.basePricePerHour || fac.pricePerHour || 110000,
      surfaceType: court.surfaceType || 'Thảm PVC tiêu chuẩn BWF',
      description: court.description || '',
      status: court.status.toUpperCase() as CourtUpsertPayload['status'],
    })
  }

  const handleSaveSubCourt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courtModalTarget) return
    setSavingCourt(true)
    try {
      if (courtModalTarget.editingCourt) {
        await courtApi.updateSubCourt(
          courtModalTarget.facilityId,
          courtModalTarget.editingCourt.id,
          courtForm
        )
        toast.success('Đã cập nhật thông tin sân con!')
      } else {
        await courtApi.addSubCourt(courtModalTarget.facilityId, courtForm)
        toast.success('Đã thêm sân con mới vào cụm sân!')
      }
      setCourtModalTarget(null)
      await loadFacilities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu sân con')
    } finally {
      setSavingCourt(false)
    }
  }

  const handleDeleteSubCourt = async (fac: Facility, court: SubCourt) => {
    if (!window.confirm(`Xóa "${court.name}" khỏi ${fac.name}?`)) return
    try {
      await courtApi.deleteSubCourt(court.id)
      toast.info(`Đã xóa ${court.name}`)
      loadFacilities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa sân con')
    }
  }

  return (
    <OwnerLayout
      title="Quản lý Cụm sân & Sân con"
      subtitle="Chuẩn hóa địa chỉ, định vị bản đồ, thiết lập tiện ích, tải ảnh cơ sở và quản lý danh sách sân con"
    >
      {/* Unified Action & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên cụm sân, quận/huyện, địa chỉ..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500"
            />
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 self-start">
            {[
              { id: 'all' as const, label: 'Tất cả' },
              { id: 'active' as const, label: 'Đang mở' },
              { id: 'maintenance' as const, label: 'Bảo trì' },
              { id: 'paused' as const, label: 'Tạm ngưng' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-white text-[#168039]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer self-start lg:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm cụm sân mới</span>
        </button>
      </div>

      {/* Facilities List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm font-semibold text-slate-600">
          Đang tải danh sách cụm sân...
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <h3 className="text-base font-bold text-slate-900">Chưa có cụm sân nào phù hợp</h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Hãy thêm cụm sân đầu tiên để bắt đầu nhận lịch đặt trực tuyến trên SmashCourt.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredFacilities.map((fac) => (
            <div
              key={fac.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              {/* Top Facility Overview */}
              <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                  <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img
                      src={fac.imageUrl}
                      alt={fac.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900">{fac.name}</h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                          fac.status === 'active'
                            ? 'bg-[#168039] text-white'
                            : fac.status === 'maintenance'
                            ? 'bg-[#e5a92c] text-white'
                            : 'bg-slate-600 text-white'
                        }`}
                      >
                        {fac.status === 'active'
                          ? 'Đang hoạt động'
                          : fac.status === 'maintenance'
                          ? 'Đang bảo trì'
                          : 'Tạm ngưng'}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs sm:text-sm text-slate-700 font-medium">
                      <MapPin className="w-4 h-4 text-[#168039] shrink-0 mt-0.5" />
                      <span>{fac.normalizedAddress || fac.address}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Giờ mở cửa: <strong className="text-slate-900">{fac.openHours}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        Hotline: <strong className="text-slate-900">{fac.phone}</strong>
                      </span>
                      <span>
                        Tọa độ:{' '}
                        <strong className="font-mono text-slate-800">
                          {fac.latitude.toFixed(4)}, {fac.longitude.toFixed(4)}
                        </strong>
                      </span>
                      <span>
                        Giá niêm yết:{' '}
                        <strong className="text-[#168039]">
                          {(fac.minPrice || fac.pricePerHour).toLocaleString('vi-VN')} -{' '}
                          {(fac.maxPrice || fac.pricePerHour).toLocaleString('vi-VN')} đ/h
                        </strong>
                      </span>
                    </div>

                    {/* Amenities chips */}
                    {fac.amenities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {fac.amenities.map((am) => (
                          <span
                            key={am}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold"
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setMapPreviewFacility(fac)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#168039]" />
                    <span>Bản đồ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(fac)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa cơ sở</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFacilityStatus(fac)}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                    title="Chuyển trạng thái Mở / Bảo trì"
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFacility(fac)}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Xóa hoặc ngừng hoạt động cụm sân"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-courts Seamless Section */}
              <div className="p-4 sm:p-5 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#168039]" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Danh sách sân con trực thuộc ({fac.subCourts.length} sân)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddSubCourt(fac)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm sân con</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {fac.subCourts.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {sc.name}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                            {sc.surfaceType || 'Thảm tiêu chuẩn BWF'}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            sc.status === 'active'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {sc.status === 'active' ? 'Sẵn sàng' : 'Bảo trì'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="font-bold text-[#168039]">
                          {(sc.basePricePerHour || fac.pricePerHour).toLocaleString('vi-VN')} đ/h
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSubCourt(fac, sc)}
                            className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubCourt(fac, sc)}
                            className="px-2 py-1 rounded-md border border-slate-200 hover:bg-rose-50 text-rose-600 font-semibold text-[11px] cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== FACILITY CREATE/EDIT MODAL ==================== */}
      {isModalOpen && formState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-xl">
            {/* Light Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 shrink-0 flex items-center justify-between gap-3 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {formState.isNew ? 'Thêm cụm sân cầu lông mới' : `Cập nhật cơ sở: ${formState.name}`}
                </h3>
                <p className="text-xs text-slate-600">
                  Điền thông tin chuẩn hóa địa chỉ, tọa độ bản đồ, tiện ích và thư viện ảnh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Switcher Tabs */}
            <div className="px-5 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'general' as const, label: '1. Thông tin & Liên hệ' },
                { id: 'map' as const, label: '2. Bản đồ & Tọa độ' },
                { id: 'amenities' as const, label: `3. Tiện ích (${formState.amenities.length})` },
                { id: 'media' as const, label: `4. Logo, Ảnh & Sân con (${formState.galleryImages.length})` },
                { id: 'settings' as const, label: '5. Đặt lịch Online & QR' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                    activeSection === tab.id
                      ? 'border-[#168039] text-[#168039] bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Body */}
            <form
              id="facilityUpsertForm"
              onSubmit={handleSaveFacility}
              className="p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm"
            >
              {activeSection === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tên chi nhánh / cụm sân *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        placeholder="VD: CLB Cầu Lông SmashCourt Cầu Giấy"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Trạng thái vận hành
                      </label>
                      <select
                        value={formState.status}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            status: e.target.value as FacilityFormState['status'],
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                      >
                        <option value="ACTIVE">Mở đặt lịch online</option>
                        <option value="MAINTENANCE">Tạm khóa bảo trì</option>
                        <option value="INACTIVE">Ẩn / Tắt nhận lịch</option>
                      </select>
                    </div>
                  </div>

                  {/* Standardized Address Fields */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">
                      Địa chỉ hành chính chuẩn hóa
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tỉnh / Thành phố *
                        </label>
                        <select
                          value={formState.city}
                          onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 cursor-pointer"
                        >
                          {CITY_OPTIONS.map((ct) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Quận / Huyện *
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.district}
                          onChange={(e) => setFormState({ ...formState, district: e.target.value })}
                          placeholder="VD: Cầu Giấy"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phường / Xã
                        </label>
                        <input
                          type="text"
                          value={formState.ward}
                          onChange={(e) => setFormState({ ...formState, ward: e.target.value })}
                          placeholder="VD: Dịch Vọng Hậu"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Số nhà, ngõ, tên đường *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.streetAddress}
                        onChange={(e) =>
                          setFormState({ ...formState, streetAddress: e.target.value })
                        }
                        placeholder="VD: Số 35 Trần Thái Tông"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900"
                      />
                    </div>

                    <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                      Chuỗi địa chỉ chuẩn hóa:{' '}
                      <strong className="text-[#168039]">{liveNormalizedAddress}</strong>
                    </div>
                  </div>

                  {/* Working Hours with 24/24 mode */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">Giờ hoạt động chi nhánh</span>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-[#168039] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.isOpen24Hours}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              isOpen24Hours: e.target.checked,
                              openTime: e.target.checked ? '00:00' : '05:00',
                              closeTime: e.target.checked ? '24:00' : '24:00',
                            })
                          }
                          className="rounded border-slate-300 text-[#168039]"
                        />
                        <span>Sân hoạt động 24/24 (00:00 - 24:00)</span>
                      </label>
                    </div>

                    {!formState.isOpen24Hours && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Từ giờ mở cửa
                          </label>
                          <select
                            value={formState.openTime}
                            onChange={(e) => setFormState({ ...formState, openTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 cursor-pointer"
                          >
                            {['00:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00'].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Đến giờ đóng cửa
                          </label>
                          <select
                            value={formState.closeTime}
                            onChange={(e) => setFormState({ ...formState, closeTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 cursor-pointer"
                          >
                            {['21:30', '22:00', '22:30', '23:00', '23:30', '24:00'].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-Phone Contact Info with Notes */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">
                      Thông tin liên hệ đa đầu số kèm ghi chú
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Số điện thoại chính *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formState.primaryPhone}
                          onChange={(e) =>
                            setFormState({ ...formState, primaryPhone: e.target.value })
                          }
                          placeholder="VD: 0866866368"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ghi chú SĐT chính
                        </label>
                        <input
                          type="text"
                          value={formState.primaryPhoneNote}
                          onChange={(e) =>
                            setFormState({ ...formState, primaryPhoneNote: e.target.value })
                          }
                          placeholder="VD: Gọi khi đặt lịch vãng lai / Chốt lịch qua Zalo"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Số điện thoại phụ (tùy chọn)
                        </label>
                        <input
                          type="tel"
                          value={formState.secondaryPhone}
                          onChange={(e) =>
                            setFormState({ ...formState, secondaryPhone: e.target.value })
                          }
                          placeholder="VD: 0364059999"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ghi chú SĐT phụ
                        </label>
                        <input
                          type="text"
                          value={formState.secondaryPhoneNote}
                          onChange={(e) =>
                            setFormState({ ...formState, secondaryPhoneNote: e.target.value })
                          }
                          placeholder="VD: Gọi khi đặt lịch cố định / Khiếu nại dịch vụ"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giới thiệu & Điều khoản quy định cơ sở
                    </label>
                    <textarea
                      rows={3}
                      value={formState.description}
                      onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-900"
                    />
                  </div>
                </div>
              )}

              {activeSection === 'map' && (
                <LocationMapPicker
                  latitude={formState.latitude}
                  longitude={formState.longitude}
                  normalizedAddress={liveNormalizedAddress}
                  onChangeCoordinates={(lat, lng) =>
                    setFormState({ ...formState, latitude: lat, longitude: lng })
                  }
                />
              )}

              {activeSection === 'amenities' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-2">
                      Chọn các tiện ích và dịch vụ phụ trợ tại sân
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {PRESET_AMENITIES.map((am) => {
                        const selected = formState.amenities.includes(am)
                        return (
                          <button
                            key={am}
                            type="button"
                            onClick={() => handleToggleAmenity(am)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#168039] bg-emerald-50 text-[#168039]'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{am}</span>
                            {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Thêm tiện ích riêng của cơ sở
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        placeholder="VD: Phòng xông hơi, Cửa hàng phụ kiện Yonex..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomAmenity}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Thêm tiện ích
                      </button>
                    </div>

                    {formState.amenities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2">
                        {formState.amenities.map((am) => (
                          <span
                            key={am}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                          >
                            <span>{am}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleAmenity(am)}
                              className="text-slate-500 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'media' && (
                <div className="space-y-5">
                  {/* Dedicated 1:1 Circular Brand Logo Picker */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={formState.logoUrl || '/images/logos/badminton-club-logo.svg'}
                        alt="Logo sân"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#168039] bg-white shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Logo thương hiệu chi nhánh (Tỷ lệ 1:1)
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Hiển thị tại avatar tròn trên thẻ danh sách sân, sidebar chi tiết và hóa đơn đặt lịch
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleUploadLogo}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold cursor-pointer"
                      >
                        {uploadingLogo ? 'Đang tải...' : 'Đổi Logo 1:1'}
                      </button>
                    </div>
                  </div>

                  {/* Image Upload Box */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Ảnh bìa & Thư viện hình ảnh thực tế ({formState.galleryImages.length} ảnh)
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Tải lên ảnh thảm sân, sơ đồ sân, bảng giá niêm yết và khu vực tiện ích (tối đa 10MB/ảnh)
                        </p>
                      </div>

                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleUploadFiles}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingFiles}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingFiles ? 'Đang tải ảnh...' : 'Tải ảnh từ máy tính'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Optional URL input */}
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                      <input
                        type="url"
                        value={manualImageUrl}
                        onChange={(e) => setManualImageUrl(e.target.value)}
                        placeholder="Hoặc dán đường dẫn URL hình ảnh trực tiếp..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualImageUrl}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        Thêm link
                      </button>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {formState.galleryImages.map((imgUrl, idx) => {
                        const isCover = formState.imageUrl === imgUrl
                        return (
                          <div
                            key={idx}
                            className={`rounded-xl overflow-hidden border-2 bg-slate-100 relative ${
                              isCover ? 'border-[#168039]' : 'border-slate-200'
                            }`}
                          >
                            <img src={imgUrl} alt="" className="w-full h-24 object-cover" />
                            <div className="p-1.5 bg-white flex items-center justify-between gap-1 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setFormState({ ...formState, imageUrl: imgUrl })}
                                className={`font-bold cursor-pointer ${
                                  isCover ? 'text-[#168039]' : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {isCover ? 'Ảnh bìa chính' : 'Đặt làm bìa'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormState({ ...formState, logoUrl: imgUrl })}
                                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                              >
                                Làm Logo
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(imgUrl)}
                                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Initial Sub-courts builder when creating a new facility */}
                  {formState.isNew && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-900">
                            Tạo nhanh hàng loạt sân con theo quy mô chi nhánh
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Nhập tổng số sân cầu lông tại cơ sở (VD: 6 sân, 9 sân) để tự động sinh Sân 1 → Sân N
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Số lượng sân
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={bulkCourtCount}
                              onChange={(e) => setBulkCourtCount(Number(e.target.value))}
                              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Giá cơ bản (đ/h)
                            </label>
                            <input
                              type="number"
                              step={5000}
                              value={bulkCourtPrice}
                              onChange={(e) => setBulkCourtPrice(Number(e.target.value))}
                              className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-[#168039]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateBulkCourts}
                            className="px-3.5 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer self-end"
                          >
                            Tạo nhanh {bulkCourtCount} sân
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">
                          Danh sách sân con sẽ khởi tạo ({formState.draftCourts.length} sân)
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const n = formState.draftCourts.length + 1
                            setFormState({
                              ...formState,
                              draftCourts: [
                                ...formState.draftCourts,
                                {
                                  name: `Sân ${n}`,
                                  courtNumber: n,
                                  courtType: 'STANDARD',
                                  basePricePerHour: bulkCourtPrice || 100000,
                                  surfaceType: 'Thảm PVC tiêu chuẩn BWF',
                                  status: 'ACTIVE',
                                },
                              ],
                            })
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                        >
                          + Thêm 1 sân lẻ
                        </button>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {formState.draftCourts.map((dc, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                          >
                            <input
                              type="text"
                              value={dc.name}
                              onChange={(e) => {
                                const next = [...formState.draftCourts]
                                next[idx] = { ...dc, name: e.target.value }
                                setFormState({ ...formState, draftCourts: next })
                              }}
                              className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900"
                            />
                            <select
                              value={dc.courtType}
                              onChange={(e) => {
                                const next = [...formState.draftCourts]
                                next[idx] = {
                                  ...dc,
                                  courtType: e.target.value as CourtUpsertPayload['courtType'],
                                }
                                setFormState({ ...formState, draftCourts: next })
                              }}
                              className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 cursor-pointer"
                            >
                              <option value="STANDARD">Tiêu chuẩn</option>
                              <option value="VIP">Thi đấu VIP</option>
                              <option value="TRAINING">Tập luyện</option>
                            </select>
                            <input
                              type="number"
                              step="5000"
                              value={dc.basePricePerHour}
                              onChange={(e) => {
                                const next = [...formState.draftCourts]
                                next[idx] = { ...dc, basePricePerHour: Number(e.target.value) }
                                setFormState({ ...formState, draftCourts: next })
                              }}
                              className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#168039]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormState({
                                  ...formState,
                                  draftCourts: formState.draftCourts.filter((_, i) => i !== idx),
                                })
                              }
                              className="sm:col-span-1 text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'settings' && (
                <div className="space-y-4">
                  {/* Online Booking Link & Toggle */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Trạng thái nhận đặt lịch trực tuyến
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Bật để khách hàng nhìn thấy bảng giờ trống và đặt sân trực tiếp trên ứng dụng
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#168039] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.enableOnlineBooking}
                          onChange={(e) =>
                            setFormState({ ...formState, enableOnlineBooking: e.target.checked })
                          }
                          className="rounded border-slate-300 text-[#168039]"
                        />
                        <span>{formState.enableOnlineBooking ? 'Đang mở đặt lịch online' : 'Đã tắt đặt lịch online'}</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="truncate text-slate-600">
                        Link đặt sân online:{' '}
                        <strong className="text-slate-900">
                          {window.location.origin}/?venue={encodeURIComponent(formState.name || 'chi-nhanh-moi')}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            `${window.location.origin}/?venue=${encodeURIComponent(formState.name || 'chi-nhanh-moi')}`
                          )
                          toast.success('Đã sao chép link đặt sân online!')
                        }}
                        className="px-2.5 py-1 rounded-md bg-emerald-50 text-[#168039] font-bold cursor-pointer shrink-0"
                      >
                        Sao chép link
                      </button>
                    </div>
                  </div>

                  {/* Booking Types Modules */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-900">
                      Loại hình đặt lịch áp dụng tại chi nhánh
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          key: 'allowOneTime' as const,
                          title: 'Đơn ngày (Khách vãng lai)',
                          desc: 'Cho phép chọn khung giờ trống theo ngày trên lưới lịch',
                        },
                        {
                          key: 'allowSchedule' as const,
                          title: 'Đơn tháng (Lịch cố định)',
                          desc: 'Đăng ký giữ sân cố định theo thứ trong tuần suốt tháng/quý',
                        },
                        {
                          key: 'allowSocial' as const,
                          title: 'Sự kiện / Vé giao lưu Social',
                          desc: 'Mở bán vé xé lẻ giao lưu cầu lông hoặc giải đấu phong trào',
                        },
                        {
                          key: 'allowMembership' as const,
                          title: 'Gói hội viên (Membership)',
                          desc: 'Cho phép thanh toán tiền sân bằng thẻ hội viên trả trước',
                        },
                      ].map((mod) => (
                        <label
                          key={mod.key}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formState[mod.key]}
                            onChange={(e) =>
                              setFormState({ ...formState, [mod.key]: e.target.checked })
                            }
                            className="mt-0.5 rounded border-slate-300 text-[#168039]"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">{mod.title}</div>
                            <div className="text-[11px] text-slate-600">{mod.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Bank Account & Dynamic QR Setup */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">
                      Tài khoản ngân hàng & Cổng thanh toán QR tự động
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Bắt buộc thiết lập tài khoản ngân hàng để bật tính năng nhận đặt lịch online và sinh mã VietQR tự động điền số tiền cọc.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ngân hàng thụ hưởng *
                        </label>
                        <select
                          value={formState.bankName}
                          onChange={(e) => setFormState({ ...formState, bankName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 cursor-pointer"
                        >
                          <option value="BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam">
                            BIDV (970418)
                          </option>
                          <option value="VietinBank - Ngân hàng TMCP Công Thương Việt Nam">
                            VietinBank (970415)
                          </option>
                          <option value="Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam">
                            Vietcombank (970436)
                          </option>
                          <option value="MBBank - Ngân hàng TMCP Quân Đội">
                            MBBank (970422)
                          </option>
                          <option value="Techcombank - Ngân hàng TMCP Kỹ Thương Việt Nam">
                            Techcombank (970407)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Số tài khoản *
                        </label>
                        <input
                          type="text"
                          value={formState.bankAccountNumber}
                          onChange={(e) =>
                            setFormState({ ...formState, bankAccountNumber: e.target.value })
                          }
                          placeholder="VD: 21510008899999"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tên chủ tài khoản (in hoa) *
                        </label>
                        <input
                          type="text"
                          value={formState.bankAccountHolder}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              bankAccountHolder: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="VD: NGUYEN VAN A"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap pt-1">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.autoFillQrAmount}
                          onChange={(e) =>
                            setFormState({ ...formState, autoFillQrAmount: e.target.checked })
                          }
                          className="rounded border-slate-300 text-[#168039]"
                        />
                        <span>Quét mã QR tự động nhập số tiền</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.requireQrDeposit}
                          onChange={(e) =>
                            setFormState({ ...formState, requireQrDeposit: e.target.checked })
                          }
                          className="rounded border-slate-300 text-[#168039]"
                        />
                        <span>Bắt buộc thanh toán tiền sân/cọc khi đặt qua mã QR</span>
                      </label>
                    </div>
                  </div>

                  {/* Online Booking Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lưu ý đặt lịch & thanh toán online hiển thị cho khách hàng
                    </label>
                    <textarea
                      rows={2}
                      value={formState.onlineBookingNote}
                      onChange={(e) =>
                        setFormState({ ...formState, onlineBookingNote: e.target.value })
                      }
                      placeholder="VD: Quý khách vui lòng chuyển khoản đúng nội dung QR để hệ thống tự động xác nhận giữ sân..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-900"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3 bg-white">
              <span className="text-xs text-slate-600 hidden sm:inline">
                Dữ liệu được đồng bộ trực tiếp lên bản đồ tìm kiếm khách hàng
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  form="facilityUpsertForm"
                  disabled={savingFacility}
                  className="px-5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer transition-colors disabled:cursor-not-allowed"
                >
                  {savingFacility ? 'Đang lưu...' : formState.isNew ? 'Tạo cụm sân' : 'Lưu cập nhật'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-COURT ADD/EDIT MODAL ==================== */}
      {courtModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {courtModalTarget.editingCourt ? 'Chỉnh sửa sân con' : 'Thêm sân con mới'}
                </h3>
                <p className="text-xs text-slate-600">{courtModalTarget.facilityName}</p>
              </div>
              <button
                type="button"
                onClick={() => setCourtModalTarget(null)}
                className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="subCourtForm"
              onSubmit={handleSaveSubCourt}
              className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên sân con *</label>
                  <input
                    type="text"
                    required
                    value={courtForm.name}
                    onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số thứ tự</label>
                  <input
                    type="number"
                    min={1}
                    value={courtForm.courtNumber || 1}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, courtNumber: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phân hạng sân</label>
                  <select
                    value={courtForm.courtType}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        courtType: e.target.value as CourtUpsertPayload['courtType'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="STANDARD">Tiêu chuẩn</option>
                    <option value="VIP">Thi đấu VIP</option>
                    <option value="TRAINING">Sân tập luyện</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={courtForm.status}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        status: e.target.value as CourtUpsertPayload['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="ACTIVE">Sẵn sàng mở đặt</option>
                    <option value="MAINTENANCE">Tạm đóng bảo trì</option>
                    <option value="INACTIVE">Ngừng khai thác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá gốc mặc định / giờ (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={courtForm.basePricePerHour}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, basePricePerHour: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-[#168039]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại mặt thảm</label>
                  <input
                    type="text"
                    value={courtForm.surfaceType || ''}
                    onChange={(e) => setCourtForm({ ...courtForm, surfaceType: e.target.value })}
                    placeholder="Thảm Yonex BWF"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-900"
                  />
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCourtModalTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="subCourtForm"
                disabled={savingCourt}
                className="px-5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
              >
                {savingCourt ? 'Đang lưu...' : 'Lưu sân con'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GOOGLE MAPS EMBED PREVIEW MODAL ==================== */}
      {mapPreviewFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bản đồ định vị: {mapPreviewFacility.name}
                </h3>
                <p className="text-xs text-slate-600">
                  {mapPreviewFacility.normalizedAddress || mapPreviewFacility.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapPreviewFacility(null)}
                className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-80 w-full bg-slate-100">
              <iframe
                title="Bản đồ Google Maps nhúng"
                src={
                  mapPreviewFacility.mapsEmbedUrl ||
                  `https://maps.google.com/maps?q=${mapPreviewFacility.latitude},${mapPreviewFacility.longitude}&z=16&output=embed`
                }
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-700">
                GPS: {mapPreviewFacility.latitude.toFixed(6)}, {mapPreviewFacility.longitude.toFixed(6)}
              </span>
              <a
                href={
                  mapPreviewFacility.mapsDirectionsUrl ||
                  `https://www.google.com/maps/dir/?api=1&destination=${mapPreviewFacility.latitude},${mapPreviewFacility.longitude}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#168039] text-white font-bold cursor-pointer"
              >
                <span>Mở chỉ đường Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}
