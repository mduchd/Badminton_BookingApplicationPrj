import React, { useState } from 'react'
import {
  Plus,
  Edit2,
  Upload,
  Clock,
  Phone,
  MapPin,
} from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { appStore } from '../../../lib/appStore'
import type { Facility, SubCourt } from '../../types/court'
import { toast } from 'sonner'

export const OwnerFacilitiesView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>(appStore.getFacilities())
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newCourtName, setNewCourtName] = useState('')

  const handleOpenEdit = (f: Facility) => {
    setEditingFacility({ ...f, subCourts: [...f.subCourts] })
    setIsModalOpen(true)
  }

  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFacility) return
    appStore.updateFacility(editingFacility)
    setFacilities(appStore.getFacilities())
    setIsModalOpen(false)
    toast.success('Đã lưu thông tin cụm sân thành công!')
  }

  const handleAddSubCourt = () => {
    if (!editingFacility || !newCourtName.trim()) return
    const newCourt: SubCourt = {
      id: `${editingFacility.id}_c${Date.now()}`,
      facilityId: editingFacility.id,
      name: newCourtName.trim(),
      courtType: 'standard',
      status: 'active',
    }
    const updated = {
      ...editingFacility,
      subCourts: [...editingFacility.subCourts, newCourt],
    }
    setEditingFacility(updated)
    setNewCourtName('')
    toast.success('Đã thêm sân con mới!')
  }

  const handleDeleteSubCourt = (courtId: string) => {
    if (!editingFacility) return
    const updated = {
      ...editingFacility,
      subCourts: editingFacility.subCourts.filter((c) => c.id !== courtId),
    }
    setEditingFacility(updated)
    toast.info('Đã xóa sân con khỏi danh sách!')
  }

  const handleSimulateUploadImage = () => {
    if (!editingFacility) return
    const sampleImages = [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    ]
    const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)]
    const updated = {
      ...editingFacility,
      galleryImages: [...editingFacility.galleryImages, randomImg],
    }
    setEditingFacility(updated)
    toast.success('Đã upload ảnh thành công qua Cloudinary CDN!')
  }

  return (
    <OwnerLayout
      title="Quản lý Cụm sân & Sân con"
      subtitle="Thiết lập danh sách cơ sở, tiện ích và các sân con trực thuộc"
    >
      {/* Top action */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          Danh sách cụm sân ({facilities.length})
        </h2>
        <button
          type="button"
          onClick={() => {
            const newF: Facility = {
              id: `court_${Date.now()}`,
              name: 'Cụm sân cầu lông mới',
              logoUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=120&auto=format&fit=crop&q=80',
              imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
              galleryImages: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80'],
              distance: '0.5 km',
              address: 'Số 10 Lê Đức Thọ, Nam Từ Liêm, Hà Nội',
              district: 'Nam Từ Liêm',
              city: 'Hà Nội',
              openHours: '06:00 - 23:00',
              rating: 5.0,
              reviewCount: 1,
              pricePerHour: 120000,
              amenities: ['Máy lạnh', 'Bãi đỗ ô tô', 'Tắm nóng lạnh'],
              latitude: 21.03,
              longitude: 105.77,
              phone: '0988 888 999',
              description: 'Cụm sân mới hiện đại với thảm BWF cao cấp.',
              ownerId: 'usr_owner_1',
              isApproved: true,
              status: 'active',
              subCourts: [
                { id: `c_${Date.now()}_1`, facilityId: `court_${Date.now()}`, name: 'Sân 1', courtType: 'standard', status: 'active' },
                { id: `c_${Date.now()}_2`, facilityId: `court_${Date.now()}`, name: 'Sân 2', courtType: 'standard', status: 'active' },
              ],
            }
            handleOpenEdit(newF)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm cụm sân mới</span>
        </button>
      </div>

      {/* Facility Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {facilities.map((fac) => (
          <div
            key={fac.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4 p-5 hover:border-slate-300 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                  <img src={fac.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{fac.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate max-w-[220px]">{fac.address}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEdit(fac)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                title="Chỉnh sửa"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-b border-slate-100 py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Giờ mở: <strong>{fac.openHours}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Hotline: <strong>{fac.phone}</strong></span>
              </div>
            </div>

            {/* Sub-courts list pill */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700">Các sân con ({fac.subCourts.length}):</span>
                <span className="text-[11px] text-slate-500">Bấm chỉnh sửa để quản lý</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {fac.subCourts.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Facility Modal */}
      {isModalOpen && editingFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Chỉnh sửa cụm sân: {editingFacility.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <form id="facilityForm" onSubmit={handleSaveFacility} className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tên cụm sân</label>
                <input
                  type="text"
                  value={editingFacility.name}
                  onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-[#168039]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Địa chỉ chi tiết</label>
                  <input
                    type="text"
                    value={editingFacility.address}
                    onChange={(e) => setEditingFacility({ ...editingFacility, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-[#168039]"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Quận / Huyện</label>
                  <input
                    type="text"
                    value={editingFacility.district}
                    onChange={(e) => setEditingFacility({ ...editingFacility, district: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-[#168039]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Giờ mở cửa</label>
                  <input
                    type="text"
                    value={editingFacility.openHours}
                    onChange={(e) => setEditingFacility({ ...editingFacility, openHours: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-[#168039]"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Hotline liên hệ</label>
                  <input
                    type="text"
                    value={editingFacility.phone}
                    onChange={(e) => setEditingFacility({ ...editingFacility, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-[#168039]"
                  />
                </div>
              </div>

              {/* Sub-Courts Management Box */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Danh sách các sân con</h4>
                  <span className="text-xs text-slate-500">{editingFacility.subCourts.length} sân</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="VD: Sân số 5 (Thảm VIP)"
                    value={newCourtName}
                    onChange={(e) => setNewCourtName(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubCourt}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800"
                  >
                    Thêm sân
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {editingFacility.subCourts.map((sc) => (
                    <div
                      key={sc.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="font-bold text-slate-900">{sc.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubCourt(sc.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cloudinary Gallery Image Upload */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Thư viện ảnh sân (Cloudinary CDN)</h4>
                  <button
                    type="button"
                    onClick={handleSimulateUploadImage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload ảnh mới</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {editingFacility.galleryImages.map((img, i) => (
                    <div key={i} className="w-16 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 relative">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                form="facilityForm"
                className="px-5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}
