import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Building,
  ArrowLeft,
} from 'lucide-react'
import { appStore } from '../../../lib/appStore'
import type { Facility } from '../../types/court'
import type { UserRole } from '../../types/user'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

interface AdminUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  phone: string
  status: 'active' | 'locked'
  joinedDate: string
}

const initialAdminUsers: AdminUser[] = [
  {
    id: 'usr_001',
    fullName: 'Nguyễn Văn Đức',
    email: 'ducnguyen.dev@gmail.com',
    role: 'SYSTEM_ADMIN',
    phone: '0988 123 456',
    status: 'active',
    joinedDate: '01/10/2026',
  },
  {
    id: 'usr_owner_1',
    fullName: 'Trần Văn Long (Chủ sân)',
    email: 'phuclong.badminton@gmail.com',
    role: 'COURT_OWNER',
    phone: '0912 345 678',
    status: 'active',
    joinedDate: '05/10/2026',
  },
  {
    id: 'usr_003',
    fullName: 'Hoàng Minh Quân',
    email: 'quan.hoang@gmail.com',
    role: 'CUSTOMER',
    phone: '0977 654 321',
    status: 'active',
    joinedDate: '12/10/2026',
  },
  {
    id: 'usr_004',
    fullName: 'Lê Thu Trang',
    email: 'thutrang.le@gmail.com',
    role: 'CUSTOMER',
    phone: '0933 222 111',
    status: 'locked',
    joinedDate: '15/10/2026',
  },
]

export const AdminPortalView: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'facilities' | 'users'>('facilities')
  const [facilities, setFacilities] = useState<Facility[]>(appStore.getFacilities())
  const [users, setUsers] = useState<AdminUser[]>(initialAdminUsers)

  // Moderation action
  const toggleApproveFacility = (id: string) => {
    const updated = facilities.map((f) => {
      if (f.id === id) {
        const nextApproved = !f.isApproved
        return { ...f, isApproved: nextApproved, status: nextApproved ? ('active' as const) : ('paused' as const) }
      }
      return f
    })
    setFacilities(updated)
    appStore.saveFacilities(updated)
    toast.success('Đã cập nhật trạng thái kiểm duyệt cụm sân!')
  }

  const toggleLockFacility = (id: string) => {
    const updated = facilities.map((f) => {
      if (f.id === id) {
        const nextStatus = f.status === 'active' ? ('paused' as const) : ('active' as const)
        return { ...f, status: nextStatus }
      }
      return f
    })
    setFacilities(updated)
    appStore.saveFacilities(updated)
    toast.info('Đã cập nhật trạng thái hoạt động của cụm sân!')
  }

  // User management action
  const toggleLockUser = (id: string) => {
    const updated = users.map((u) => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? ('locked' as const) : ('active' as const) }
      }
      return u
    })
    setUsers(updated)
    toast.info('Đã cập nhật trạng thái khóa/mở tài khoản!')
  }

  const changeUserRole = (id: string, newRole: UserRole) => {
    const updated = users.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    setUsers(updated)
    toast.success(`Đã cập nhật quyền tài khoản sang: ${newRole}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bảng điều khiển Quản trị viên
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Giám sát vận hành toàn hệ thống SmashCourt, kiểm duyệt cơ sở và phân quyền tài khoản
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>Về trang người dùng</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('facilities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
            activeTab === 'facilities'
              ? 'bg-[#168039] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Kiểm duyệt Cụm sân ({facilities.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
            activeTab === 'users'
              ? 'bg-[#168039] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quản lý Tài khoản ({users.length})</span>
        </button>
      </div>

      {/* Tab 1: Facilities Moderation */}
      {activeTab === 'facilities' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Danh sách các Cụm sân trong hệ thống</h3>
              <p className="text-xs text-slate-500">Kiểm tra thông tin pháp lý, phê duyệt hiển thị hoặc tạm dừng cụm sân vi phạm</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3.5">Cụm sân</th>
                  <th className="p-3.5">Khu vực</th>
                  <th className="p-3.5">Số sân con</th>
                  <th className="p-3.5">Trạng thái duyệt</th>
                  <th className="p-3.5">Vận hành</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facilities.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                          <img src={fac.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <strong className="text-slate-900 block">{fac.name}</strong>
                          <span className="text-[11px] text-slate-500">{fac.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">{fac.district}, {fac.city}</td>
                    <td className="p-3.5 font-bold text-slate-900">{fac.subCourts.length} sân</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          fac.isApproved
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {fac.isApproved ? 'Đã duyệt' : 'Chờ kiểm duyệt'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          fac.status === 'active'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {fac.status === 'active' ? 'Đang mở' : 'Đang khóa'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => toggleApproveFacility(fac.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          fac.isApproved
                            ? 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-[#168039] text-white hover:bg-[#136c30]'
                        }`}
                      >
                        {fac.isApproved ? 'Hủy duyệt' : 'Duyệt cụm sân'}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleLockFacility(fac.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          fac.status === 'active'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {fac.status === 'active' ? 'Tạm khóa' : 'Mở lại'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Danh sách Tài khoản người dùng</h3>
            <span className="text-xs text-slate-500 font-medium">Phân quyền theo vai trò</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3.5">Họ và tên</th>
                  <th className="p-3.5">Email / SĐT</th>
                  <th className="p-3.5">Vai trò hiện tại</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">{u.fullName}</td>
                    <td className="p-3.5 text-slate-700">
                      <div>{u.email}</div>
                      <span className="text-[11px] text-slate-500">{u.phone}</span>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                        className="p-1.5 rounded-lg border border-slate-200 font-bold text-xs bg-slate-50 text-slate-900 cursor-pointer"
                      >
                        <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                        <option value="COURT_OWNER">Chủ sân (COURT_OWNER)</option>
                        <option value="SYSTEM_ADMIN">Quản trị viên (SYSTEM_ADMIN)</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => toggleLockUser(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          u.status === 'active'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
