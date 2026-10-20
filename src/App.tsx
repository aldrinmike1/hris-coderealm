import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NavigationTab, Employee } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Toast } from './components/common/Toast';
import { LoginModal } from './components/auth/LoginModal';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { EmployeeList } from './components/employees/EmployeeList';
import { EmployeeModal } from './components/employees/EmployeeModal';
import { EmployeeDetailModal } from './components/employees/EmployeeDetailModal';
import { EmployeeIDCardModal } from './components/employees/EmployeeIDCardModal';
import { DTRDashboard } from './components/dtr/DTRDashboard';
import { DTRPunchModal } from './components/dtr/DTRPunchModal';
import { PayrollDashboard } from './components/payroll/PayrollDashboard';
import { DeductionsDashboard } from './components/deductions/DeductionsDashboard';
import { ThirteenthMonthPayView } from './components/payroll/ThirteenthMonthPayView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { SettingsView } from './components/settings/SettingsView';
import { SSSMatrixView } from './components/sss/SSSMatrixView';
import { UsersView } from './components/users/UsersView';
import { LoginPage } from './components/auth/LoginPage';
import { X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { toast, hideToast, isStaff, currentUser, isAuthenticated } = useApp();

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Employee Modals State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [idCardEmployee, setIdCardEmployee] = useState<Employee | null>(null);

  // DTR Punch Kiosk Modal
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleViewEmployeeDTR = (emp: Employee) => {
    setActiveTab('dtr');
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F1F5F9] font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Desktop Enterprise Dark Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          activeTab={activeTab}
          onTabChange={tab => {
            setActiveTab(tab);
          }}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenPunchModal={() => setIsPunchModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-64 max-w-[80vw] h-full bg-slate-900 text-white z-10 shadow-2xl">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              onTabChange={tab => {
                setActiveTab(tab);
                setIsMobileMenuOpen(false);
              }}
              onOpenLoginModal={() => {
                setIsMobileMenuOpen(false);
                setIsLoginModalOpen(true);
              }}
              onOpenPunchModal={() => {
                setIsMobileMenuOpen(false);
                setIsPunchModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAddEmployee={handleOpenAddEmployee}
          onOpenPunchModal={() => setIsPunchModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6" id="main-view-scroll-container">
          <div className="max-w-7xl mx-auto space-y-4">
            {activeTab === 'dashboard' && (
              <ExecutiveDashboard
                onNavigate={setActiveTab}
                onOpenPunchModal={() => setIsPunchModalOpen(true)}
                onOpenAddEmployee={handleOpenAddEmployee}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeList
                onAddEmployee={handleOpenAddEmployee}
                onEditEmployee={handleOpenEditEmployee}
                onViewEmployee={setViewingEmployee}
                onViewIDCard={setIdCardEmployee}
                onViewDTR={handleViewEmployeeDTR}
              />
            )}

            {activeTab === 'dtr' && <DTRDashboard />}

            {activeTab === 'payroll' && <PayrollDashboard />}

            {activeTab === 'deductions' && <DeductionsDashboard />}

            {activeTab === 'thirteenth-month' && <ThirteenthMonthPayView />}

            {activeTab === 'users' && <UsersView />}

            {activeTab === 'audit' && <AuditTrailView />}

            {activeTab === 'settings' && <SettingsView />}

            {activeTab === 'sss-matrix' && <SSSMatrixView />}
          </div>
        </div>

        {/* High Density Footer Strip */}
        <footer className="h-8 bg-white border-t border-slate-300 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">HRIS PRO</span>
            <span>•</span>
            <span>PH Statutory Payroll & Time Engine</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">Audit Active</span>
          </div>
          <div className="hidden sm:block font-mono text-[10px] text-slate-400">
            SSS 2026 • PhilHealth 5% • Pag-IBIG HDMF • BIR TRAIN
          </div>
        </footer>
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        employeeToEdit={editingEmployee}
        employee={editingEmployee}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
      />

      <EmployeeDetailModal
        isOpen={!!viewingEmployee}
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        onEditEmployee={emp => {
          setViewingEmployee(null);
          handleOpenEditEmployee(emp);
        }}
        onViewIDCard={emp => {
          setViewingEmployee(null);
          setIdCardEmployee(emp);
        }}
        onViewDTR={emp => {
          setViewingEmployee(null);
          handleViewEmployeeDTR(emp);
        }}
      />

      <EmployeeIDCardModal
        isOpen={!!idCardEmployee}
        employee={idCardEmployee}
        onClose={() => setIdCardEmployee(null)}
      />

      <DTRPunchModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
