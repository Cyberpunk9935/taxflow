import {
  User,
  Business,
  IncomeRecord,
  ExpenseRecord,
  ExpenseCategory,
  DocumentItem,
  TaxRule,
  TaxFiling,
  NotificationItem,
  AuditLogEntry,
  BankTransaction,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-rajesh',
    name: 'Rajesh Sharma',
    email: 'rajesh@nexify.com',
    role: 'OWNER',
    isActive: true,
    joinedDate: '2023-04-10',
    assignedBusinessIds: ['biz-nexify', 'biz-bharat', 'biz-surya'],
    avatarUrl: 'RS',
  },
  {
    id: 'user-priya',
    name: 'Priya Mehta',
    email: 'priya.ca@taxpro.in',
    role: 'ACCOUNTANT',
    isActive: true,
    joinedDate: '2023-05-15',
    assignedBusinessIds: ['biz-nexify', 'biz-bharat', 'biz-surya'],
    avatarUrl: 'PM',
  },
  {
    id: 'user-admin',
    name: 'Aakash Verma',
    email: 'admin@taxflowsmb.com',
    role: 'ADMIN',
    isActive: true,
    joinedDate: '2022-01-01',
    avatarUrl: 'AV',
  },
];

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz-nexify',
    ownerId: 'user-rajesh',
    name: 'Nexify Solutions Pvt Ltd',
    type: 'Private Limited',
    ownerName: 'Rajesh Sharma',
    address: 'Suite 402, Trade Tower, Bandra Kurla Complex, Mumbai, MH 400051',
    phone: '+91 98201 44552',
    email: 'finance@nexify.com',
    taxRegistrationNo: '27AABCS1429B1Z5',
    panNumber: 'AABCS1429B',
    financialYear: '2024-25',
    assignedAccountantId: 'user-priya',
    createdAt: '2023-04-12',
    updatedAt: '2025-03-20',
  },
  {
    id: 'biz-bharat',
    ownerId: 'user-rajesh',
    name: 'Bharat Logistics & Cold Chain LLP',
    type: 'LLP',
    ownerName: 'Sunil Patil & Rajesh Sharma',
    address: 'Warehouse Hub 12, MIDC Industrial Area, Pune, MH 411018',
    phone: '+91 98902 33441',
    email: 'accounts@bharatlogistics.in',
    taxRegistrationNo: '27AAACB9876C1Z8',
    panNumber: 'AAACB9876C',
    financialYear: '2024-25',
    assignedAccountantId: 'user-priya',
    createdAt: '2023-08-01',
    updatedAt: '2025-03-15',
  },
  {
    id: 'biz-surya',
    ownerId: 'user-rajesh',
    name: 'Surya Digital Retailers',
    type: 'Sole Proprietorship',
    ownerName: 'Surya Narayanan',
    address: '77 Commercial Street, Indiranagar, Bengaluru, KA 560038',
    phone: '+91 94481 99002',
    email: 'surya@suryaretail.com',
    taxRegistrationNo: '29BKPPS4821M1Z2',
    panNumber: 'BKPPS4821M',
    financialYear: '2024-25',
    assignedAccountantId: 'user-priya',
    createdAt: '2024-01-10',
    updatedAt: '2025-03-10',
  },
];

export const INITIAL_BUSINESS: Business = INITIAL_BUSINESSES[0];


export const INITIAL_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'cat-payroll',
    name: 'Payroll & Salaries',
    description: 'Direct compensation for engineering, sales, and operations personnel (Section 36(1)(ii))',
    isAllowable: true,
    color: '#7dd3fc',
  },
  {
    id: 'cat-infra',
    name: 'Cloud Infra & SaaS',
    description: 'AWS, Google Cloud, GitHub, and production server expenditures',
    isAllowable: true,
    color: '#c8a0f0',
  },
  {
    id: 'cat-rent',
    name: 'Office & Lease',
    description: 'Commercial premise lease, co-working memberships, maintenance',
    isAllowable: true,
    color: '#88b4cc',
  },
  {
    id: 'cat-vendor',
    name: 'Vendor Contractors',
    description: 'Sub-contracted professional technical services and design contracts',
    isAllowable: true,
    color: '#38bdf8',
  },
  {
    id: 'cat-marketing',
    name: 'Digital Marketing',
    description: 'Google Ads, Meta Ads, and performance marketing acquisition campaigns',
    isAllowable: true,
    color: '#818cf8',
  },
  {
    id: 'cat-travel',
    name: 'Business Travel',
    description: 'Client on-site travel, lodging, and transport for executive team',
    isAllowable: true,
    color: '#f472b6',
  },
  {
    id: 'cat-disallowed',
    name: 'Statutory Penalties & Fines',
    description: 'Interest on late GST/TDS filings or traffic penalties (Non-deductible under Sec 37)',
    isAllowable: false,
    color: '#ff6b6b',
  },
];

export const INITIAL_TAX_RULES: TaxRule[] = [
  {
    id: 'rule-base',
    financialYear: '2024-25',
    taxType: 'Corporate Income Tax',
    slabName: 'Base Corporate Surcharge Rate (Sec 115BAA)',
    incomeMin: 0,
    incomeMax: null,
    rate: 22.0,
    fixedDeduction: 0,
    effectiveDate: '2024-04-01',
    expiryDate: '2025-03-31',
    isActive: false,
  },
  {
    id: 'rule-sme-25',
    financialYear: '2024-25',
    taxType: 'Corporate Income Tax',
    slabName: 'SME Concessional Rate (Turnover < ₹50 Cr)',
    incomeMin: 0,
    incomeMax: null,
    rate: 25.0,
    fixedDeduction: 0,
    effectiveDate: '2024-04-01',
    expiryDate: '2025-03-31',
    isActive: true,
  },
  {
    id: 'rule-cess',
    financialYear: '2024-25',
    taxType: 'Corporate Income Tax',
    slabName: 'Health & Education Cess Surcharge',
    incomeMin: 5000000,
    incomeMax: null,
    rate: 4.0,
    fixedDeduction: 0,
    effectiveDate: '2024-04-01',
    expiryDate: '2025-03-31',
    isActive: false,
  },
  // Previous FY Rules
  {
    id: 'rule-fy23-base',
    financialYear: '2023-24',
    taxType: 'Corporate Income Tax',
    slabName: 'FY 23-24 Standard Corporate Bracket',
    incomeMin: 0,
    incomeMax: null,
    rate: 25.0,
    fixedDeduction: 0,
    effectiveDate: '2023-04-01',
    expiryDate: '2024-03-31',
    isActive: true,
  },
];

export const INITIAL_INCOMES: IncomeRecord[] = [
  {
    id: 'inc-01',
    businessId: 'biz-nexify',
    date: '2025-03-18',
    invoiceNo: 'NEX-2024-118',
    customer: 'Nexus Tech Corp',
    description: 'Q4 Enterprise Retainer Milestone',
    amount: 420000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-01',
    reviewed: true,
    createdAt: '2025-03-18T10:00:00Z',
  },
  {
    id: 'inc-02',
    businessId: 'biz-nexify',
    date: '2025-03-12',
    invoiceNo: 'NEX-2024-1094',
    customer: 'Alpha Health Solutions',
    description: 'Consulting Services Invoice #1094',
    amount: 285000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-02',
    reviewed: true,
    createdAt: '2025-03-12T14:30:00Z',
  },
  {
    id: 'inc-03',
    businessId: 'biz-nexify',
    date: '2025-02-24',
    invoiceNo: 'NEX-2024-098',
    customer: 'Zeta FinTech Labs',
    description: 'Payment Gateway Integration Phase II',
    amount: 550000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-03',
    reviewed: true,
    createdAt: '2025-02-24T11:20:00Z',
  },
  {
    id: 'inc-04',
    businessId: 'biz-nexify',
    date: '2025-02-10',
    invoiceNo: 'NEX-2024-092',
    customer: 'BlueRay Logistics',
    description: 'Warehouse Automation Platform Maintenance',
    amount: 320000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-04',
    reviewed: true,
    createdAt: '2025-02-10T16:00:00Z',
  },
  {
    id: 'inc-05',
    businessId: 'biz-nexify',
    date: '2025-01-20',
    invoiceNo: 'NEX-2024-084',
    customer: 'Nexus Tech Corp',
    description: 'Q3 Advisory & System Maintenance',
    amount: 380000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-05',
    reviewed: true,
    createdAt: '2025-01-20T09:15:00Z',
  },
  {
    id: 'inc-06',
    businessId: 'biz-nexify',
    date: '2024-12-15',
    invoiceNo: 'NEX-2024-075',
    customer: 'Apex Global Retail',
    description: 'E-commerce API Optimization',
    amount: 460000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-06',
    reviewed: true,
    createdAt: '2024-12-15T12:00:00Z',
  },
  {
    id: 'inc-07',
    businessId: 'biz-nexify',
    date: '2024-11-28',
    invoiceNo: 'NEX-2024-068',
    customer: 'Alpha Health Solutions',
    description: 'Telemedicine Telephony Integration',
    amount: 490000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-07',
    reviewed: true,
    createdAt: '2024-11-28T15:45:00Z',
  },
  {
    id: 'inc-08',
    businessId: 'biz-nexify',
    date: '2024-10-18',
    invoiceNo: 'NEX-2024-057',
    customer: 'Zenith Ventures',
    description: 'Due Diligence Tech Audit',
    amount: 410000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-08',
    reviewed: true,
    createdAt: '2024-10-18T11:00:00Z',
  },
  {
    id: 'inc-09',
    businessId: 'biz-nexify',
    date: '2024-09-22',
    invoiceNo: 'NEX-2024-046',
    customer: 'Omni Media Group',
    description: 'Digital Asset CMS Customization',
    amount: 350000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-09',
    reviewed: true,
    createdAt: '2024-09-22T10:30:00Z',
  },
  {
    id: 'inc-10',
    businessId: 'biz-nexify',
    date: '2024-08-14',
    invoiceNo: 'NEX-2024-039',
    customer: 'Zeta FinTech Labs',
    description: 'Smart Contract Audit and Deployment',
    amount: 430000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-10',
    reviewed: true,
    createdAt: '2024-08-14T13:20:00Z',
  },
  {
    id: 'inc-11',
    businessId: 'biz-nexify',
    date: '2024-07-29',
    invoiceNo: 'NEX-2024-028',
    customer: 'BlueRay Logistics',
    description: 'Fleet Tracking Dashboard Phase 1',
    amount: 395000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-11',
    reviewed: true,
    createdAt: '2024-07-29T16:10:00Z',
  },
  {
    id: 'inc-12',
    businessId: 'biz-nexify',
    date: '2024-06-19',
    invoiceNo: 'NEX-2024-019',
    customer: 'Apex Global Retail',
    description: 'Microservices Architecture Overhaul',
    amount: 320000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-12',
    reviewed: true,
    createdAt: '2024-06-19T14:00:00Z',
  },
  {
    id: 'inc-13',
    businessId: 'biz-nexify',
    date: '2024-05-15',
    invoiceNo: 'NEX-2024-011',
    customer: 'Nexus Tech Corp',
    description: 'Q1 System Onboarding Retainer',
    amount: 270000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-13',
    reviewed: true,
    createdAt: '2024-05-15T11:40:00Z',
  },
  {
    id: 'inc-14',
    businessId: 'biz-nexify',
    date: '2024-04-20',
    invoiceNo: 'NEX-2024-004',
    customer: 'Solarium Software',
    description: 'Annual License & Cloud Engineering Retainer',
    amount: 270000,
    paymentStatus: 'RECONCILED',
    documentId: 'doc-14',
    reviewed: true,
    createdAt: '2024-04-20T10:15:00Z',
  },
];

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-01',
    businessId: 'biz-nexify',
    date: '2025-03-15',
    invoiceNo: 'AWS-IND-99214',
    vendor: 'AWS Cloud India Pvt Ltd',
    description: 'Cloud Server Dedicated Instances',
    categoryId: 'cat-infra',
    amount: 74800,
    paymentMethod: 'Corporate Card',
    documentId: 'doc-exp-01',
    reviewed: true,
    createdAt: '2025-03-15T09:00:00Z',
  },
  {
    id: 'exp-02',
    businessId: 'biz-nexify',
    date: '2025-03-10',
    invoiceNo: 'WW-BKC-3382',
    vendor: 'WeWork India Estates',
    description: 'Co-working Hub Lease Rental',
    categoryId: 'cat-rent',
    amount: 115000,
    paymentMethod: 'Bank Transfer',
    documentId: 'doc-exp-02',
    reviewed: true,
    createdAt: '2025-03-10T12:00:00Z',
  },
  {
    id: 'exp-03',
    businessId: 'biz-nexify',
    date: '2025-03-06',
    invoiceNo: 'META-IE-49219',
    vendor: 'Meta Platforms Ireland',
    description: 'Digital Campaign Ad Credits',
    categoryId: 'cat-marketing',
    amount: 45200,
    paymentMethod: 'Corporate Card',
    // Missing document intentionally to match Image 1's "Invoice Pending" state!
    documentId: undefined,
    reviewed: false,
    createdAt: '2025-03-06T15:20:00Z',
  },
  {
    id: 'exp-04',
    businessId: 'biz-nexify',
    date: '2025-02-28',
    invoiceNo: 'SAL-FEB-2025',
    vendor: 'Direct Deposit Payroll',
    description: 'February 2025 Core Team Salary Disbursements',
    categoryId: 'cat-payroll',
    amount: 410000,
    paymentMethod: 'Bank Transfer',
    documentId: 'doc-exp-04',
    reviewed: true,
    createdAt: '2025-02-28T18:00:00Z',
  },
  {
    id: 'exp-05',
    businessId: 'biz-nexify',
    date: '2025-01-31',
    invoiceNo: 'SAL-JAN-2025',
    vendor: 'Direct Deposit Payroll',
    description: 'January 2025 Core Team Salary Disbursements',
    categoryId: 'cat-payroll',
    amount: 403000,
    paymentMethod: 'Bank Transfer',
    documentId: 'doc-exp-05',
    reviewed: true,
    createdAt: '2025-01-31T18:00:00Z',
  },
  {
    id: 'exp-06',
    businessId: 'biz-nexify',
    date: '2025-01-15',
    invoiceNo: 'AWS-IND-88120',
    vendor: 'AWS Cloud India Pvt Ltd',
    description: 'Cloud Compute and Database Cluster Subscriptions',
    categoryId: 'cat-infra',
    amount: 120000,
    paymentMethod: 'Corporate Card',
    documentId: 'doc-exp-06',
    reviewed: true,
    createdAt: '2025-01-15T11:00:00Z',
  },
  {
    id: 'exp-07',
    businessId: 'biz-nexify',
    date: '2024-12-20',
    invoiceNo: 'DEV-CONTRACT-88',
    vendor: 'CodeCraft Technologies LLP',
    description: 'Frontend React UI Contractor Engagement',
    categoryId: 'cat-vendor',
    amount: 257000,
    paymentMethod: 'Bank Transfer',
    documentId: 'doc-exp-07',
    reviewed: true,
    createdAt: '2024-12-20T14:10:00Z',
  },
  {
    id: 'exp-08',
    businessId: 'biz-nexify',
    date: '2024-11-12',
    invoiceNo: 'GGL-ADS-77319',
    vendor: 'Google India Digital Services',
    description: 'Search Engine Marketing Campaigns',
    categoryId: 'cat-marketing',
    amount: 146800,
    paymentMethod: 'Corporate Card',
    documentId: 'doc-exp-08',
    reviewed: true,
    createdAt: '2024-11-12T16:00:00Z',
  },
  {
    id: 'exp-09',
    businessId: 'biz-nexify',
    date: '2024-10-25',
    invoiceNo: 'WW-BKC-2291',
    vendor: 'WeWork India Estates',
    description: 'Q3 Office Extension Desks & Conference Rooms',
    categoryId: 'cat-rent',
    amount: 206000,
    paymentMethod: 'Bank Transfer',
    documentId: 'doc-exp-09',
    reviewed: true,
    createdAt: '2024-10-25T13:30:00Z',
  },
  {
    id: 'exp-10',
    businessId: 'biz-nexify',
    date: '2024-09-18',
    invoiceNo: 'VISTARA-AIR-554',
    vendor: 'Tata SIA Airlines (Vistara)',
    description: 'Executive Team Flights - Bengaluru Client Summit',
    categoryId: 'cat-travel',
    amount: 129000,
    paymentMethod: 'Corporate Card',
    documentId: 'doc-exp-10',
    reviewed: true,
    createdAt: '2024-09-18T10:00:00Z',
  },
  {
    id: 'exp-11',
    businessId: 'biz-nexify',
    date: '2024-08-20',
    invoiceNo: 'AWS-IND-77102',
    vendor: 'AWS Cloud India Pvt Ltd',
    description: 'Elastic Load Balancers & RDS Postgre Instances',
    categoryId: 'cat-infra',
    amount: 233200,
    paymentMethod: 'Corporate Card',
    documentId: 'doc-exp-11',
    reviewed: true,
    createdAt: '2024-08-20T15:00:00Z',
  },
  {
    id: 'exp-12',
    businessId: 'biz-nexify',
    date: '2024-07-15',
    invoiceNo: 'PEN-FINE-441',
    vendor: 'Department of Revenue',
    description: 'Statutory Late Deposit Interest (Disallowed Sec 37)',
    categoryId: 'cat-disallowed',
    amount: 160000,
    paymentMethod: 'Bank Transfer',
    documentId: 'doc-exp-12',
    reviewed: true,
    createdAt: '2024-07-15T11:00:00Z',
  },
  {
    id: 'exp-13',
    businessId: 'biz-nexify',
    date: '2024-05-10',
    invoiceNo: 'GSUITE-SUB-99',
    vendor: 'Google Cloud Platform Workspace',
    description: 'Annual Google Workspace Business Enterprise Seats',
    categoryId: 'cat-infra',
    amount: 35000,
    paymentMethod: 'Corporate Card',
    documentId: 'doc-exp-13',
    reviewed: true,
    createdAt: '2024-05-10T12:00:00Z',
  },
  {
    id: 'exp-cash-flagged',
    businessId: 'biz-nexify',
    date: '2025-02-14',
    invoiceNo: 'CASH-VOUCHER-088',
    vendor: 'Shree Sai Office Decor & Hardware',
    description: 'Urgent office partition & electrical repairs (Paid via Cash)',
    categoryId: 'cat-rent',
    amount: 24500,
    paymentMethod: 'Cash',
    reviewed: false,
    createdAt: '2025-02-14T11:00:00Z',
  },
  {
    id: 'exp-bharat-01',
    businessId: 'biz-bharat',
    date: '2025-03-01',
    invoiceNo: 'HPCL-FLEET-902',
    vendor: 'Hindustan Petroleum Corp Ltd',
    description: 'Commercial refrigerated fleet diesel bulk fueling',
    categoryId: 'cat-infra',
    amount: 145000,
    paymentMethod: 'Bank Transfer',
    reviewed: true,
    createdAt: '2025-03-01T10:00:00Z',
  },
  {
    id: 'exp-surya-01',
    businessId: 'biz-surya',
    date: '2025-03-04',
    invoiceNo: 'BLR-PACK-331',
    vendor: 'Bangalore Packaging Supplies',
    description: 'Corrugated boxes, bubble wrap & shipping labels',
    categoryId: 'cat-infra',
    amount: 32000,
    paymentMethod: 'UPI',
    reviewed: true,
    createdAt: '2025-03-04T12:00:00Z',
  },
];

export const INITIAL_BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'btx-01',
    businessId: 'biz-nexify',
    date: '2025-03-18',
    description: 'NEFT CR: NEXUS TECH CORP / RET-Q4',
    referenceNo: 'HDFC0001294821',
    amount: 420000,
    type: 'CREDIT',
    paymentMode: 'NEFT',
    status: 'MATCHED',
    matchedRecordType: 'INCOME',
    matchedRecordId: 'inc-01',
  },
  {
    id: 'btx-02',
    businessId: 'biz-nexify',
    date: '2025-03-15',
    description: 'POS CORP CARD: AMAZON WEB SERVICES MUMBAI',
    referenceNo: 'POS88912384',
    amount: 74800,
    type: 'DEBIT',
    paymentMode: 'IMPS',
    status: 'MATCHED',
    matchedRecordType: 'EXPENSE',
    matchedRecordId: 'exp-01',
  },
  {
    id: 'btx-03',
    businessId: 'biz-nexify',
    date: '2025-03-12',
    description: 'RTGS CR: ALPHA HEALTH SOLN CLIENT PAYMENT',
    referenceNo: 'SBIN992384112',
    amount: 285000,
    type: 'CREDIT',
    paymentMode: 'RTGS',
    status: 'MATCHED',
    matchedRecordType: 'INCOME',
    matchedRecordId: 'inc-02',
  },
  {
    id: 'btx-04',
    businessId: 'biz-nexify',
    date: '2025-03-10',
    description: 'RTGS DR: WEWORK INDIA ESTATES LEASE MAR',
    referenceNo: 'HDFCR55239101',
    amount: 115000,
    type: 'DEBIT',
    paymentMode: 'RTGS',
    status: 'MATCHED',
    matchedRecordType: 'EXPENSE',
    matchedRecordId: 'exp-02',
  },
  {
    id: 'btx-05',
    businessId: 'biz-nexify',
    date: '2025-03-05',
    description: 'NEFT CR: ENTERPRISE CLIENT ADVANCE DEPOSIT (Unreconciled)',
    referenceNo: 'ICIC99841284',
    amount: 175000,
    type: 'CREDIT',
    paymentMode: 'NEFT',
    status: 'UNMATCHED',
  },
  {
    id: 'btx-06',
    businessId: 'biz-nexify',
    date: '2025-03-01',
    description: 'IMPS DR: UNRECORDED DEV TOOLS SAAS (Unreconciled)',
    referenceNo: 'IMPS33918293',
    amount: 22400,
    type: 'DEBIT',
    paymentMode: 'IMPS',
    status: 'UNMATCHED',
  },
  {
    id: 'btx-07',
    businessId: 'biz-nexify',
    date: '2025-02-28',
    description: 'RTGS DR: BULK SALARY DISBURSEMENT FEB 2025',
    referenceNo: 'CORP-SAL-FEB-01',
    amount: 410000,
    type: 'DEBIT',
    paymentMode: 'RTGS',
    status: 'MATCHED',
    matchedRecordType: 'EXPENSE',
    matchedRecordId: 'exp-04',
  },
  {
    id: 'btx-08',
    businessId: 'biz-nexify',
    date: '2025-02-14',
    description: 'CASH SELF WITHDRAWAL (Office Hardware Petty Cash)',
    referenceNo: 'CHQ-SELF-8821',
    amount: 24500,
    type: 'DEBIT',
    paymentMode: 'CASH',
    status: 'MATCHED',
    matchedRecordType: 'EXPENSE',
    matchedRecordId: 'exp-cash-flagged',
  },
];


export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-01',
    businessId: 'biz-nexify',
    name: 'Nexus_Tech_Milestone_Invoice_118.pdf',
    docType: 'Invoice',
    fileSize: 482100,
    fileType: 'pdf',
    uploadDate: '2025-03-18',
    linkedRecordType: 'INCOME',
    linkedRecordId: 'inc-01',
    status: 'VERIFIED',
  },
  {
    id: 'doc-02',
    businessId: 'biz-nexify',
    name: 'Alpha_Health_Invoice_1094.pdf',
    docType: 'Invoice',
    fileSize: 312000,
    fileType: 'pdf',
    uploadDate: '2025-03-12',
    linkedRecordType: 'INCOME',
    linkedRecordId: 'inc-02',
    status: 'VERIFIED',
  },
  {
    id: 'doc-exp-01',
    businessId: 'biz-nexify',
    name: 'AWS_Tax_Invoice_March_2025.pdf',
    docType: 'Expense Bill',
    fileSize: 845200,
    fileType: 'pdf',
    uploadDate: '2025-03-15',
    linkedRecordType: 'EXPENSE',
    linkedRecordId: 'exp-01',
    status: 'VERIFIED',
  },
  {
    id: 'doc-exp-02',
    businessId: 'biz-nexify',
    name: 'WeWork_BKC_Rental_Receipt_Mar25.pdf',
    docType: 'Receipt',
    fileSize: 520000,
    fileType: 'pdf',
    uploadDate: '2025-03-10',
    linkedRecordType: 'EXPENSE',
    linkedRecordId: 'exp-02',
    status: 'VERIFIED',
  },
  {
    id: 'doc-bank-q4',
    businessId: 'biz-nexify',
    name: 'HDFC_Current_Account_Q4_Statement.pdf',
    docType: 'Bank Statement',
    fileSize: 2450000,
    fileType: 'pdf',
    uploadDate: '2025-03-19',
    status: 'PENDING_REVIEW', // 1 pending review to match Image 1
  },
  {
    id: 'doc-gst-gstr3b',
    businessId: 'biz-nexify',
    name: 'GSTR_3B_Filed_Acknowledgement_Q3.pdf',
    docType: 'Tax Document',
    fileSize: 1120000,
    fileType: 'pdf',
    uploadDate: '2025-01-20',
    status: 'VERIFIED',
  },
  {
    id: 'doc-prev-itr',
    businessId: 'biz-nexify',
    name: 'ITR_6_Acknowledgement_AY2024_25.pdf',
    docType: 'Previous Filing',
    fileSize: 980000,
    fileType: 'pdf',
    uploadDate: '2024-10-30',
    status: 'VERIFIED',
  },
];

export const INITIAL_FILING: TaxFiling = {
  id: 'filing-fy24-25',
  businessId: 'biz-nexify',
  financialYear: '2024-25',
  status: 'UNDER_REVIEW', // Step 2 of 4 matching Image 1
  taxableAmount: 2720000,
  taxAmount: 680000,
  reviewedBy: 'Priya Mehta',
  reviewNotes: 'Q4 ledgers cross-checked with bank statements. 1 ad-credit receipt pending documentation before marking Ready to File.',
  history: [
    {
      status: 'DRAFT',
      changedBy: 'Rajesh Sharma',
      role: 'OWNER',
      timestamp: '2025-02-15 11:30 AM',
      notes: 'Initial filing ledger drafted for FY 24-25.',
    },
    {
      status: 'UNDER_REVIEW',
      changedBy: 'Rajesh Sharma',
      role: 'OWNER',
      timestamp: '2025-03-01 02:45 PM',
      notes: 'Submitted ledger to external CA Priya Mehta for Section 37 deductible review.',
    },
  ],
  updatedAt: '2025-03-20T10:00:00Z',
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'user-rajesh',
    businessId: 'biz-nexify',
    title: 'Action Required: Missing Expense Receipt',
    message: 'Digital Campaign Ad Credits (₹45,200) from Meta Platforms requires invoice attachment.',
    type: 'MISSING_DOC',
    isRead: false,
    linkPage: 'documents',
    createdAt: 'Today, 09:30 AM',
  },
  {
    id: 'notif-2',
    userId: 'user-rajesh',
    businessId: 'biz-nexify',
    title: 'Upcoming Statutory Deadline: Advance Tax Q4',
    message: 'Final installment of Advance Tax for FY 2024-25 was due on 15 March. Verify challan receipt.',
    type: 'DEADLINE',
    isRead: false,
    linkPage: 'tax-summary',
    createdAt: 'Today, 08:15 AM',
  },
  {
    id: 'notif-3',
    userId: 'user-rajesh',
    businessId: 'biz-nexify',
    title: 'Accountant Audit Note Added',
    message: 'Priya Mehta reviewed 14 transactions and requested GST 2A/2B reconciliations.',
    type: 'STATUS_CHANGE',
    isRead: false,
    linkPage: 'filing',
    createdAt: 'Yesterday, 04:20 PM',
  },
  {
    id: 'notif-4',
    userId: 'user-rajesh',
    businessId: 'biz-nexify',
    title: 'Bank Statement Auto-Sync Complete',
    message: 'HDFC Current Account ledger entries matched through 18 March 2025.',
    type: 'UNVERIFIED_TX',
    isRead: true,
    linkPage: 'dashboard',
    createdAt: '3 days ago',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-01',
    userId: 'user-rajesh',
    userName: 'Rajesh Sharma',
    action: 'LOGIN',
    entity: 'User',
    entityId: 'user-rajesh',
    details: 'User authenticated from IP 114.143.19.82 via MFA Bearer Session',
    ip: '114.143.19.82',
    timestamp: '2025-03-20 09:12:44',
  },
  {
    id: 'audit-02',
    userId: 'user-rajesh',
    userName: 'Rajesh Sharma',
    action: 'CREATE',
    entity: 'Income',
    entityId: 'inc-01',
    details: 'Created income entry NEX-2024-118 for ₹4,20,000 (Nexus Tech Corp)',
    ip: '114.143.19.82',
    timestamp: '2025-03-18 10:05:12',
  },
  {
    id: 'audit-03',
    userId: 'user-priya',
    userName: 'Priya Mehta (CA)',
    action: 'STATUS_CHANGE',
    entity: 'TaxFiling',
    entityId: 'filing-fy24-25',
    details: 'Assessed deductible expenses and logged review notes for Under Review status',
    ip: '49.36.120.4',
    timestamp: '2025-03-15 16:45:00',
    oldValue: 'DRAFT',
    newValue: 'UNDER_REVIEW',
  },
  {
    id: 'audit-04',
    userId: 'user-admin',
    userName: 'Aakash Verma (Admin)',
    action: 'UPDATE',
    entity: 'TaxRule',
    entityId: 'rule-sme-25',
    details: 'Updated active status for SME Concessional Rate (Sec 115BAA)',
    ip: '182.73.220.10',
    timestamp: '2025-03-01 11:20:00',
  },
];

// LocalStorage Persistence Service
const STORAGE_KEY_PREFIX = 'taxflow_smb_';

export class AppStorage {
  private static getItem<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setItem<T>(key: string, val: T): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
    } catch (e) {
      console.warn('Storage setItem failed:', e);
    }
  }

  static getUsers(): User[] {
    return this.getItem('users', INITIAL_USERS);
  }

  static setUsers(users: User[]): void {
    this.setItem('users', users);
  }

  static getCurrentUser(): User {
    const users = this.getUsers();
    const storedId = this.getItem('current_user_id', 'user-rajesh');
    const user = users.find((u) => u.id === storedId);
    return user || users[0];
  }

  static setCurrentUserId(id: string): void {
    this.setItem('current_user_id', id);
  }

  static getBusinesses(): Business[] {
    return this.getItem('businesses', INITIAL_BUSINESSES);
  }

  static setBusinesses(businesses: Business[]): void {
    this.setItem('businesses', businesses);
  }

  static getActiveBusinessId(): string {
    return this.getItem('active_business_id', INITIAL_BUSINESSES[0].id);
  }

  static setActiveBusinessId(id: string): void {
    this.setItem('active_business_id', id);
  }

  static getBusiness(): Business {
    const list = this.getBusinesses();
    const activeId = this.getActiveBusinessId();
    return list.find((b) => b.id === activeId) || list[0] || INITIAL_BUSINESS;
  }

  static setBusiness(biz: Business): void {
    const list = this.getBusinesses();
    const idx = list.findIndex((b) => b.id === biz.id);
    if (idx >= 0) {
      list[idx] = biz;
    } else {
      list.push(biz);
    }
    this.setBusinesses(list);
    this.setItem('business', biz);
  }

  static getBankTransactions(businessId?: string): BankTransaction[] {
    const all = this.getItem('bank_transactions', INITIAL_BANK_TRANSACTIONS);
    if (businessId) {
      return all.filter((t) => t.businessId === businessId);
    }
    return all;
  }

  static setBankTransactions(txs: BankTransaction[]): void {
    this.setItem('bank_transactions', txs);
  }


  static getCategories(): ExpenseCategory[] {
    return this.getItem('categories', INITIAL_CATEGORIES);
  }

  static setCategories(cats: ExpenseCategory[]): void {
    this.setItem('categories', cats);
  }

  static getTaxRules(): TaxRule[] {
    return this.getItem('tax_rules', INITIAL_TAX_RULES);
  }

  static setTaxRules(rules: TaxRule[]): void {
    this.setItem('tax_rules', rules);
  }

  static getIncomes(): IncomeRecord[] {
    return this.getItem('incomes', INITIAL_INCOMES);
  }

  static setIncomes(incomes: IncomeRecord[]): void {
    this.setItem('incomes', incomes);
  }

  static getExpenses(): ExpenseRecord[] {
    return this.getItem('expenses', INITIAL_EXPENSES);
  }

  static setExpenses(expenses: ExpenseRecord[]): void {
    this.setItem('expenses', expenses);
  }

  static getDocuments(): DocumentItem[] {
    return this.getItem('documents', INITIAL_DOCUMENTS);
  }

  static setDocuments(docs: DocumentItem[]): void {
    this.setItem('documents', docs);
  }

  static getFiling(): TaxFiling {
    return this.getItem('filing', INITIAL_FILING);
  }

  static setFiling(filing: TaxFiling): void {
    this.setItem('filing', filing);
  }

  static getNotifications(): NotificationItem[] {
    return this.getItem('notifications', INITIAL_NOTIFICATIONS);
  }

  static setNotifications(notifs: NotificationItem[]): void {
    this.setItem('notifications', notifs);
  }

  static getAuditLogs(): AuditLogEntry[] {
    return this.getItem('audit_logs', INITIAL_AUDIT_LOGS);
  }

  static logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: 'audit-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    logs.unshift(newEntry);
    this.setItem('audit_logs', logs.slice(0, 200)); // retain last 200
  }

  static resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'users');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'business');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'categories');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'tax_rules');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'incomes');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'expenses');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'documents');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'filing');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'notifications');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'audit_logs');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'current_user_id');
  }
}
