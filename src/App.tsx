/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  User,
  Business,
  ExpenseCategory,
  TaxRule,
  IncomeRecord,
  ExpenseRecord,
  DocumentItem,
  TaxFiling,
  NotificationItem,
  AuditLogEntry,
  FilingStatus,
  BankTransaction,
} from './types';
import { AppStorage } from './services/storage';
import { calculate_tax } from './core/tax_engine';

// Components
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { HelpModal } from './components/HelpModal';
import { QuickRecordModal } from './components/QuickRecordModal';
import { ExportModal } from './components/ExportModal';
import { AiReceiptScannerModal } from './components/AiReceiptScannerModal';
import { EntitySwitcherModal } from './components/EntitySwitcherModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';

// Workspace pages are split into per-tab chunks so the initial download stays
// small. Each is already rendered conditionally by currentTab, so the lazy
// boundary adds no new mount/unmount behaviour.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const BusinessProfilePage = lazy(() =>
  import('./pages/BusinessProfilePage').then((m) => ({ default: m.BusinessProfilePage }))
);
const IncomePage = lazy(() =>
  import('./pages/IncomePage').then((m) => ({ default: m.IncomePage }))
);
const ExpensesPage = lazy(() =>
  import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage }))
);
const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
);
const TaxSummaryPage = lazy(() =>
  import('./pages/TaxSummaryPage').then((m) => ({ default: m.TaxSummaryPage }))
);
const FilingStatusPage = lazy(() =>
  import('./pages/FilingStatusPage').then((m) => ({ default: m.FilingStatusPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const TestsPage = lazy(() => import('./pages/TestsPage').then((m) => ({ default: m.TestsPage })));
const AdvanceTaxPage = lazy(() =>
  import('./pages/AdvanceTaxPage').then((m) => ({ default: m.AdvanceTaxPage }))
);
const ScenarioSimulatorPage = lazy(() =>
  import('./pages/ScenarioSimulatorPage').then((m) => ({ default: m.ScenarioSimulatorPage }))
);
const BankReconciliationPage = lazy(() =>
  import('./pages/BankReconciliationPage').then((m) => ({ default: m.BankReconciliationPage }))
);

const SESSION_STORAGE_KEY = 'taxflow_session_auth';

export default function App() {
  // Session Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const sess =
        sessionStorage.getItem(SESSION_STORAGE_KEY) ||
        localStorage.getItem(SESSION_STORAGE_KEY);
      return Boolean(sess);
    } catch {
      return false;
    }
  });

  // Navigation View State: 'landing' | 'login' | 'register' | 'app'
  const [view, setView] = useState<'app' | 'landing' | 'login' | 'register'>(() => {
    try {
      const sess =
        sessionStorage.getItem(SESSION_STORAGE_KEY) ||
        localStorage.getItem(SESSION_STORAGE_KEY);
      return sess ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [financialYear, setFinancialYear] = useState<string>('2024-25');

  // Application Data States
  const [allUsers, setAllUsers] = useState<User[]>(() => AppStorage.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedUserStr =
        sessionStorage.getItem('taxflow_session_user') ||
        localStorage.getItem('taxflow_session_user');
      if (savedUserStr) {
        return JSON.parse(savedUserStr);
      }
    } catch {
      // fallback
    }
    return AppStorage.getCurrentUser();
  });

  // Multi-Entity Management States
  const [businesses, setBusinesses] = useState<Business[]>(() => AppStorage.getBusinesses());
  const [business, setBusiness] = useState<Business>(() => AppStorage.getBusiness());
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() =>
    AppStorage.getBankTransactions()
  );

  const [categories, setCategories] = useState<ExpenseCategory[]>(() => AppStorage.getCategories());
  const [taxRules, setTaxRules] = useState<TaxRule[]>(() => AppStorage.getTaxRules());
  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => AppStorage.getIncomes());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => AppStorage.getExpenses());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => AppStorage.getDocuments());
  const [filing, setFiling] = useState<TaxFiling>(() => AppStorage.getFiling());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    AppStorage.getNotifications()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => AppStorage.getAuditLogs());

  // Registration to Login transfer state
  const [authPrefilledEmail, setAuthPrefilledEmail] = useState<string>('');
  const [authSuccessNotice, setAuthSuccessNotice] = useState<string | null>(null);

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAiScannerModalOpen, setIsAiScannerModalOpen] = useState(false);
  const [isEntitySwitcherOpen, setIsEntitySwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [preselectedExpenseForUpload, setPreselectedExpenseForUpload] =
    useState<ExpenseRecord | null>(null);



  // Sync state to AppStorage
  useEffect(() => {
    AppStorage.setUsers(allUsers);
  }, [allUsers]);

  useEffect(() => {
    AppStorage.setCurrentUserId(currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    AppStorage.setBusiness(business);
  }, [business]);

  useEffect(() => {
    AppStorage.setCategories(categories);
  }, [categories]);

  useEffect(() => {
    AppStorage.setTaxRules(taxRules);
  }, [taxRules]);

  useEffect(() => {
    AppStorage.setIncomes(incomes);
  }, [incomes]);

  useEffect(() => {
    AppStorage.setExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    AppStorage.setDocuments(documents);
  }, [documents]);

  useEffect(() => {
    AppStorage.setFiling(filing);
  }, [filing]);

  useEffect(() => {
    AppStorage.setNotifications(notifications);
  }, [notifications]);

  // Login handler
  const handleLoginSuccess = (user: User, remember: boolean) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    try {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(SESSION_STORAGE_KEY, 'active_jwt_token_verified');
      storage.setItem('taxflow_session_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    AppStorage.logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: `User signed in successfully via ${user.authProvider === 'google' ? 'Google OAuth' : 'Password Credentials'}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
    setView('app');
  };

  // Register handler (User registered -> sends to Login to sign in)
  const handleRegisterSuccess = (newUser: User) => {
    setAllUsers((prev) => [newUser, ...prev]);
    setAuthPrefilledEmail(newUser.email);
    setAuthSuccessNotice(`Account created for ${newUser.name}! Please log in.`);

    AppStorage.logAudit({
      userId: newUser.id,
      userName: newUser.name,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser.id,
      details: `New account registered as ${newUser.role} (${newUser.authProvider || 'email'})`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());

    // If registered via email: redirect to login
    if (newUser.authProvider !== 'google') {
      setView('login');
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem('taxflow_session_user');
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('taxflow_session_user');
    } catch (e) {
      console.warn('Storage clear failed:', e);
    }
    setIsAuthenticated(false);
    setView('login');
  };

  // Handlers for Income
  const handleAddIncome = (record: Omit<IncomeRecord, 'id' | 'createdAt'>) => {
    const newRec: IncomeRecord = {
      ...record,
      id: 'inc-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setIncomes((prev) => [newRec, ...prev]);
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CREATE',
      entity: 'Income',
      entityId: newRec.id,
      details: `Added income entry #${newRec.invoiceNo} for ₹${newRec.amount} (${newRec.customer})`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleUpdateIncome = (record: IncomeRecord) => {
    setIncomes((prev) => prev.map((item) => (item.id === record.id ? record : item)));
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'UPDATE',
      entity: 'Income',
      entityId: record.id,
      details: `Updated income entry #${record.invoiceNo}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleDeleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter((item) => item.id !== id));
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'DELETE',
      entity: 'Income',
      entityId: id,
      details: `Deleted income record ID: ${id}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  // Handlers for Expenses
  const handleAddExpense = (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const newRec: ExpenseRecord = {
      ...record,
      id: 'exp-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newRec, ...prev]);
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CREATE',
      entity: 'Expense',
      entityId: newRec.id,
      details: `Added expense disbursement #${newRec.invoiceNo} for ₹${newRec.amount} to ${newRec.vendor}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleUpdateExpense = (record: ExpenseRecord) => {
    setExpenses((prev) => prev.map((item) => (item.id === record.id ? record : item)));
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'UPDATE',
      entity: 'Expense',
      entityId: record.id,
      details: `Updated expense entry #${record.invoiceNo}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'DELETE',
      entity: 'Expense',
      entityId: id,
      details: `Deleted expense record ID: ${id}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  // Handlers for Documents
  const handleUploadDocument = (doc: Omit<DocumentItem, 'id' | 'uploadDate'>) => {
    const newDoc: DocumentItem = {
      ...doc,
      id: 'doc-' + Date.now(),
      uploadDate: new Date().toISOString().split('T')[0],
    };
    setDocuments((prev) => [newDoc, ...prev]);

    if (doc.linkedRecordType === 'EXPENSE' && doc.linkedRecordId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === doc.linkedRecordId ? { ...e, documentId: newDoc.id, reviewed: true } : e
        )
      );
    }

    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'UPLOAD',
      entity: 'Document',
      entityId: newDoc.id,
      details: `Uploaded & vaulted document: ${newDoc.name} (${newDoc.docType})`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setExpenses((prev) =>
      prev.map((e) => (e.documentId === id ? { ...e, documentId: undefined } : e))
    );
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'DELETE',
      entity: 'Document',
      entityId: id,
      details: `Removed document ID: ${id}`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  // Filing Status State Machine Handler
  const handleUpdateFilingStatus = (nextStatus: FilingStatus, notes?: string) => {
    const oldStatus = filing.status;
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newHistory = [
      ...filing.history,
      {
        status: nextStatus,
        changedBy: currentUser.name,
        role: currentUser.role,
        timestamp: nowStr,
        notes,
      },
    ];

    setFiling({
      ...filing,
      status: nextStatus,
      reviewedBy: currentUser.role === 'ACCOUNTANT' ? currentUser.name : filing.reviewedBy,
      reviewNotes: notes || filing.reviewNotes,
      history: newHistory,
      updatedAt: new Date().toISOString(),
    });

    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      userId: currentUser.id,
      businessId: business.id,
      title: `Filing Status Changed to ${nextStatus}`,
      message: `Updated by ${currentUser.name} (${currentUser.role}). ${notes ? `Note: "${notes}"` : ''}`,
      type: 'STATUS_CHANGE',
      isRead: false,
      linkPage: 'filing',
      createdAt: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'STATUS_CHANGE',
      entity: 'TaxFiling',
      entityId: filing.id,
      details: `Filing status transitioned from ${oldStatus} to ${nextStatus}`,
      ip: '114.143.19.82',
      oldValue: oldStatus,
      newValue: nextStatus,
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleAttachExpenseDoc = (expense: ExpenseRecord) => {
    setPreselectedExpenseForUpload(expense);
    setCurrentTab('documents');
  };

  // Multi-Entity Management Handlers
  const handleSelectBusiness = (newBiz: Business) => {
    setBusiness(newBiz);
    AppStorage.setActiveBusinessId(newBiz.id);
    setFinancialYear(newBiz.financialYear || '2024-25');
    setBankTransactions(AppStorage.getBankTransactions(newBiz.id));
    AppStorage.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'LOGIN',
      entity: 'Business',
      entityId: newBiz.id,
      details: `Switched active entity context to ${newBiz.name} (${newBiz.panNumber})`,
      ip: '114.143.19.82',
    });
    setAuditLogs(AppStorage.getAuditLogs());
  };

  const handleAddBusiness = (newBiz: Business) => {
    const updated = [...businesses, newBiz];
    setBusinesses(updated);
    AppStorage.setBusinesses(updated);
  };

  const handleUpdateBankTransactions = (txs: BankTransaction[]) => {
    setBankTransactions(txs);
    AppStorage.setBankTransactions(txs);
  };

  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const liveTaxSummary = useMemo(() => {
    const bizIncomes = incomes.filter((i) => i.businessId === business.id);
    const bizExpenses = expenses.filter((e) => e.businessId === business.id);
    const gross = bizIncomes.reduce((a, c) => a + c.amount, 0);
    const totalExp = bizExpenses.reduce((a, c) => a + c.amount, 0);
    const allowable = bizExpenses.reduce((acc, curr) => {
      const cat = catMap.get(curr.categoryId);
      return (cat?.isAllowable ?? true) ? acc + curr.amount : acc;
    }, 0);
    return calculate_tax({
      grossIncome: gross,
      totalExpenses: totalExp,
      allowableExpenses: allowable,
      rules: taxRules.filter((r) => r.financialYear === financialYear),
      period: `FY ${financialYear}`,
    });
  }, [incomes, expenses, business.id, catMap, taxRules, financialYear]);

  // ================= VIEW ROUTING & ACCESS GATING =================

  // If user is not authenticated and attempts to access 'app', redirect to 'login'
  if (view === 'app' && !isAuthenticated) {
    return (
      <AuthPages
        initialMode="login"
        users={allUsers}
        prefilledEmail={authPrefilledEmail}
        registrationSuccessMessage="Please sign in to access your tax filing records."
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        isAuthenticated={isAuthenticated}
        onGetStarted={() => {
          setAuthPrefilledEmail('');
          setAuthSuccessNotice(null);
          setView('register');
        }}
        onLogin={() => {
          setAuthSuccessNotice(null);
          setView('login');
        }}
        onOpenDashboard={() => {
          if (isAuthenticated) {
            setView('app');
          } else {
            setView('login');
          }
        }}
      />
    );
  }

  if (view === 'login' || view === 'register') {
    return (
      <AuthPages
        initialMode={view}
        users={allUsers}
        prefilledEmail={authPrefilledEmail}
        registrationSuccessMessage={authSuccessNotice}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  // Logged-in protected application workspace
  return (
    <div className="min-h-screen bg-[#071120] text-[#e0e8f0] flex antialiased">
      {/* Predictive Left Sidebar with Mobile Drawer support */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userRole={currentUser.role}
        docCount={documents.length}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        onOpenFilingModal={() => setCurrentTab('filing')}
        onSignOut={handleSignOut}
        onOpenAiScanner={() => setIsAiScannerModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main View Area (Responsive margin: 0 on mobile, 64 on lg screens) */}
      <div className="ml-0 lg:ml-64 flex-1 flex flex-col min-h-screen overflow-x-hidden pb-28 lg:pb-8">
        {/* Shared Top Navigation Bar */}
        <TopNav
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={setCurrentUser}
          financialYear={financialYear}
          onChangeFY={setFinancialYear}
          notifications={notifications}
          onSelectTab={setCurrentTab}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          business={business}
          onOpenEntitySwitcher={() => setIsEntitySwitcherOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenAiScanner={() => setIsAiScannerModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Dynamic Canvas Routing */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24 text-[#7dd3fc] text-sm font-medium">
                Loading…
              </div>
            }
          >

          {currentTab === 'dashboard' && (
            <DashboardPage
              incomes={incomes}
              expenses={expenses}
              categories={categories}
              documents={documents}
              filing={filing}
              currentUser={currentUser}
              financialYear={financialYear}
              onSelectTab={setCurrentTab}
              onOpenRecordModal={() => setIsRecordModalOpen(true)}
              onUploadForExpense={handleAttachExpenseDoc}
            />
          )}

          {currentTab === 'business' && (
            <BusinessProfilePage
              business={business}
              onSaveBusiness={(b) => {
                setBusiness(b);
                AppStorage.logAudit({
                  userId: currentUser.id,
                  userName: currentUser.name,
                  action: 'UPDATE',
                  entity: 'Business',
                  entityId: b.id,
                  details: 'Updated business statutory profile particulars',
                  ip: '114.143.19.82',
                });
                setAuditLogs(AppStorage.getAuditLogs());
              }}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'income' && (
            <IncomePage
              incomes={incomes.filter((i) => i.businessId === business.id)}
              onAddIncome={handleAddIncome}
              onUpdateIncome={handleUpdateIncome}
              onDeleteIncome={handleDeleteIncome}
              financialYear={financialYear}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesPage
              expenses={expenses.filter((e) => e.businessId === business.id)}
              categories={categories}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onAttachDocument={handleAttachExpenseDoc}
              financialYear={financialYear}
              onOpenAiScanner={() => setIsAiScannerModalOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsPage
              documents={documents}
              expenses={expenses}
              incomes={incomes}
              onUploadDocument={handleUploadDocument}
              onDeleteDocument={handleDeleteDocument}
              preselectedExpense={preselectedExpenseForUpload}
              onClearPreselectedExpense={() => setPreselectedExpenseForUpload(null)}
            />
          )}

          {currentTab === 'advance-tax' && (
            <AdvanceTaxPage
              business={business}
              taxableIncome={liveTaxSummary.taxableAmount}
              computedTaxLiability={liveTaxSummary.taxAmount}
              financialYear={financialYear}
            />
          )}

          {currentTab === 'tax-simulator' && (
            <ScenarioSimulatorPage
              business={business}
              actualGrossIncome={liveTaxSummary.totalIncome}
              actualExpenses={liveTaxSummary.totalExpenses}
              financialYear={financialYear}
            />
          )}

          {currentTab === 'bank-recon' && (
            <BankReconciliationPage
              business={business}
              bankTransactions={bankTransactions}
              incomes={incomes.filter((i) => i.businessId === business.id)}
              expenses={expenses.filter((e) => e.businessId === business.id)}
              onAddIncome={handleAddIncome}
              onAddExpense={handleAddExpense}
              onUpdateBankTransactions={handleUpdateBankTransactions}
              financialYear={financialYear}
            />
          )}

          {currentTab === 'tax-summary' && (
            <TaxSummaryPage
              incomes={incomes.filter((i) => i.businessId === business.id)}
              expenses={expenses.filter((e) => e.businessId === business.id)}
              categories={categories}
              taxRules={taxRules}
              documents={documents}
              filing={filing}
              financialYear={financialYear}
              onChangeFY={setFinancialYear}
              onSendToFiling={() => setCurrentTab('filing')}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          )}

          {currentTab === 'filing' && (
            <FilingStatusPage
              filing={filing}
              currentUser={currentUser}
              business={business}
              incomes={incomes}
              expenses={expenses}
              documents={documents}
              onUpdateStatus={handleUpdateFilingStatus}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsPage
              business={business}
              incomes={incomes.filter((i) => i.businessId === business.id)}
              expenses={expenses.filter((e) => e.businessId === business.id)}
              categories={categories}
              taxRules={taxRules}
              financialYear={financialYear}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              onMarkAsRead={(id) => {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
                );
              }}
              onMarkAllAsRead={() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
              }}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'admin' && (
            <AdminPage
              users={allUsers}
              onUpdateUser={(u) => {
                setAllUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
                if (currentUser.id === u.id) setCurrentUser(u);
              }}
              categories={categories}
              onAddCategory={(c) => {
                const newCat: ExpenseCategory = { ...c, id: 'cat-' + Date.now() };
                setCategories((prev) => [...prev, newCat]);
              }}
              onUpdateCategory={(c) => {
                setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x)));
              }}
              onDeleteCategory={(id) => {
                setCategories((prev) => prev.filter((x) => x.id !== id));
              }}
              taxRules={taxRules}
              onAddTaxRule={(r) => {
                const newR: TaxRule = { ...r, id: 'rule-' + Date.now() };
                setTaxRules((prev) => [...prev, newR]);
              }}
              onUpdateTaxRule={(r) => {
                setTaxRules((prev) => prev.map((x) => (x.id === r.id ? r : x)));
              }}
              onToggleRuleActive={(id) => {
                setTaxRules((prev) =>
                  prev.map((x) => (x.id === id ? { ...x, isActive: !x.isActive } : x))
                );
              }}
              auditLogs={auditLogs}
            />
          )}

          {currentTab === 'tests' && <TestsPage />}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet, hidden on lg screens) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0f1524]/95 backdrop-blur-xl border-t border-[#7dd3fc]/15 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer min-w-[52px] ${
            currentTab === 'dashboard' ? 'text-[#7dd3fc]' : 'text-[#a0b4c4] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-xl">dashboard</span>
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('income')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer min-w-[52px] ${
            currentTab === 'income' ? 'text-[#7dd3fc]' : 'text-[#a0b4c4] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-xl">payments</span>
          <span>Income</span>
        </button>

        {/* Center Quick Record (+) Button */}
        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] border-2 border-[#7dd3fc]/60 text-white flex items-center justify-center shadow-[0_0_20px_rgba(125,211,252,0.4)] active:scale-90 transition-transform cursor-pointer"
          title="Record Transaction"
        >
          <span className="material-symbols-outlined text-2xl font-bold">add</span>
        </button>

        <button
          onClick={() => setCurrentTab('expenses')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer min-w-[52px] ${
            currentTab === 'expenses' ? 'text-[#7dd3fc]' : 'text-[#a0b4c4] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-xl">receipt_long</span>
          <span>Expenses</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer min-w-[52px] ${
            !['dashboard', 'income', 'expenses'].includes(currentTab)
              ? 'text-[#7dd3fc]'
              : 'text-[#a0b4c4] hover:text-[#7dd3fc]'
          }`}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-xl">menu</span>
            {!['dashboard', 'income', 'expenses'].includes(currentTab) && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#7dd3fc] animate-pulse"></span>
            )}
          </div>
          <span>
            {!['dashboard', 'income', 'expenses'].includes(currentTab)
              ? currentTab === 'advance-tax'
                ? 'Adv Tax'
                : currentTab === 'tax-simulator'
                ? 'Simulator'
                : currentTab === 'bank-recon'
                ? 'Recon'
                : currentTab === 'tax-summary'
                ? 'Summary'
                : 'Menu'
              : 'Menu'}
          </span>
        </button>
      </nav>


      {/* Quick Record Modal */}
      <QuickRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        categories={categories}
        onAddIncome={handleAddIncome}
        onAddExpense={handleAddExpense}
        financialYear={financialYear}
      />

      {/* Help & Statutory Guidance Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentTab={currentTab}
        financialYear={financialYear}
        business={business}
        incomes={incomes}
        expenses={expenses}
        categories={categories}
        taxRules={taxRules}
      />

      {/* AI Receipt Scanner & Section 37 Classifier Modal */}
      <AiReceiptScannerModal
        isOpen={isAiScannerModalOpen}
        onClose={() => setIsAiScannerModalOpen(false)}
        categories={categories}
        onAddExpense={handleAddExpense}
        businessId={business.id}
      />

      {/* Multi-Entity / Client Switcher Modal */}
      <EntitySwitcherModal
        isOpen={isEntitySwitcherOpen}
        onClose={() => setIsEntitySwitcherOpen(false)}
        businesses={businesses}
        activeBusiness={business}
        onSelectBusiness={handleSelectBusiness}
        onAddBusiness={handleAddBusiness}
      />

    </div>
  );
}
