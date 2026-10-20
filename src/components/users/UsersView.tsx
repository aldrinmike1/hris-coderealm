import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemUser } from '../../types';
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  X,
  AlertTriangle,
  Building2,
  Lock,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const {
    systemUsers,
    currentUser,
    addSystemUser,
    updateSystemUser,
    deleteSystemUser,
    assignUserRole,
    isSuperAdmin,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super admin' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [assignRoleUser, setAssignRoleUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as 'super admin' | 'admin',
    department: 'Human Resources',
    position: 'HR Administrator',
    status: 'active' as 'active' | 'inactive',
    password: '',
    avatarUrl: '',
  });

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'admin',
      department: 'Human Resources',
      position: 'HR Administrator',
      status: 'active',
      password: '',
      avatarUrl: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: (user.role === 'super admin' || (user.role as string) === 'super_admin' ? 'super admin' : 'admin'),
      department: user.department || '',
      position: user.position || '',
      status: user.status || 'active',
      password: user.password || '',
      avatarUrl: user.avatarUrl || '',
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (editingUser) {
      updateSystemUser(editingUser.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        department: formData.department.trim(),
        position: formData.position.trim(),
        status: formData.status,
        password: formData.password || editingUser.password,
        avatarUrl: formData.avatarUrl.trim() || undefined,
      });
      setEditingUser(null);
    } else {
      addSystemUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        department: formData.department.trim(),
        position: formData.position.trim(),
        status: formData.status,
        password: formData.password || 'admin',
        avatarUrl: formData.avatarUrl.trim() || undefined,
      });
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingUser) {
      deleteSystemUser(deletingUser.id);
      setDeletingUser(null);
    }
  };

  const filteredUsers = systemUsers.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isSuper = user.role === 'super admin' || (user.role as string) === 'super_admin';
    const matchesRole =
      roleFilter === 'all'
        ? true
        : roleFilter === 'super admin'
        ? isSuper
        : !isSuper;

    const matchesStatus =
      statusFilter === 'all' ? true : user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const superAdminCount = systemUsers.filter(u => u.role === 'super admin' || (u.role as string) === 'super_admin').length;
  const adminCount = systemUsers.filter(u => u.role === 'admin' || u.role === 'manager' || u.role === 'staff').length;
  const activeCount = systemUsers.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-blue-100 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">System Users & Access Management</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Manage administrative user accounts authorized to log in, operate HRIS & Payroll pages, and perform system functions.
            <span className="font-semibold text-slate-700 ml-1">
              (Note: System users are separate from the employee masterlist roster).
            </span>
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors self-start md:self-auto shrink-0"
          id="add-system-user-btn"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add System User</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total System Users</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{systemUsers.length}</div>
          </div>
          <div className="p-3 bg-slate-100 rounded-full text-slate-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Super Admins</div>
            <div className="text-2xl font-bold text-purple-700 mt-1">{superAdminCount}</div>
          </div>
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admins</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{adminCount}</div>
          </div>
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Accounts</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</div>
          </div>
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user name, email, department..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="super admin">Super Admin</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">System User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No system users match the selected search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const isSuper = user.role === 'super admin' || (user.role as string) === 'super_admin';
                  const isSelf = user.id === currentUser.id;

                  return (
                    <tr key={`user-row-${user.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Shield className="w-3 h-3 text-purple-600" />
                            Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            Admin
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{user.department || 'General Admin'}</div>
                        <div className="text-slate-500 text-[11px]">{user.position || 'System Operator'}</div>
                      </td>

                      <td className="py-3 px-4">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                        {user.lastLoginAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(user.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Never logged in</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setAssignRoleUser(user)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                          title="Assign User Role"
                        >
                          Role
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                          title="Edit User Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          disabled={isSelf}
                          className={`p-1.5 rounded transition-colors ${
                            isSelf
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                          title={isSelf ? 'Cannot delete your active account' : 'Delete System User'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit System User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingUser ? 'Edit System User Account' : 'Add New System User'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Email / Username *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. maria.santos@hris-corp.ph"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Access Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="admin">Admin (Full HRIS & Payroll Access)</option>
                    <option value="super admin">Super Admin (Full System & User Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active (Login Enabled)</option>
                    <option value="inactive">Inactive / Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Human Resources"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Position / Designation</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g. Payroll Specialist"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Leave blank to keep existing password' : 'Enter login password (e.g. admin)'}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {editingUser ? 'Save Account Changes' : 'Create System Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Quick Modal */}
      {assignRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Assign System Role</h3>
              </div>
              <button
                onClick={() => setAssignRoleUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600">
                Select access role for <strong className="text-slate-900">{assignRoleUser.name}</strong>:
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  assignUserRole(assignRoleUser.id, 'super admin');
                  setAssignRoleUser(null);
                }}
                className={`w-full p-3 rounded border text-left flex items-start gap-3 transition-colors ${
                  assignRoleUser.role === 'super admin' || assignRoleUser.role === 'super_admin'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Super Admin</div>
                  <div className="text-[11px] text-slate-500">Full administrative control including user management & system settings.</div>
                </div>
              </button>

              <button
                onClick={() => {
                  assignUserRole(assignRoleUser.id, 'admin');
                  setAssignRoleUser(null);
                }}
                className={`w-full p-3 rounded border text-left flex items-start gap-3 transition-colors ${
                  assignRoleUser.role === 'admin'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Admin</div>
                  <div className="text-[11px] text-slate-500">Operational control over employees, DTRs, payroll & statutory calculations.</div>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAssignRoleUser(null)}
                className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Confirm User Account Deletion</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the system user account for{' '}
              <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.email})? This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
