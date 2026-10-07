import { v4 as uuid } from 'uuid'
import type { Category, Account, Settings } from './db'

/* ─── 12 Brand Swatches (CodeNova Palette) ─── */
export const BRAND_SWATCHES = [
  '#1F3B6F', // Tech Navy
  '#00BFA6', // Brand Teal
  '#FF7A59', // Coral Orange
  '#2563EB', // Cobalt Blue
  '#0D9488', // Dark Teal
  '#16A34A', // Forest Green
  '#D97706', // Amber Gold
  '#D4183D', // Crimson Red
  '#4F46E5', // Indigo
  '#7A9CBF', // Steel Blue
  '#475569', // Slate Gray
  '#334155', // Deep Slate
]

/* ─── Default Categories ───────────────────── */

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: uuid(), type: 'expense', name: 'Food',               icon: 'UtensilsCrossed', color: '#1F3B6F', order: 0,  isDefault: true, keywords: ['food','lunch','dinner','breakfast','meal','restaurant','eat','khana'] },
  { id: uuid(), type: 'expense', name: 'Chai & Snacks',      icon: 'Coffee',          color: '#D97706', order: 1,  isDefault: true, keywords: ['chai','tea','coffee','snack','biscuit','chips','maggi','samosa'] },
  { id: uuid(), type: 'expense', name: 'Groceries',          icon: 'ShoppingCart',    color: '#16A34A', order: 2,  isDefault: true, keywords: ['grocery','groceries','kirana','sabji','vegetables','fruits','milk','dal','rice'] },
  { id: uuid(), type: 'expense', name: 'Transport',          icon: 'Bus',             color: '#2563EB', order: 3,  isDefault: true, keywords: ['transport','bus','metro','train','local','travel','commute','auto','rickshaw','cab','ola','uber','rapido'] },
  { id: uuid(), type: 'expense', name: 'Fuel',               icon: 'Fuel',            color: '#FF7A59', order: 4,  isDefault: true, keywords: ['fuel','petrol','diesel','pump'] },
  { id: uuid(), type: 'expense', name: 'Rent / Hostel',      icon: 'Home',            color: '#1F3B6F', order: 5,  isDefault: true, keywords: ['rent','hostel','pg','room','accommodation','flat'] },
  { id: uuid(), type: 'expense', name: 'Mess',               icon: 'ChefHat',         color: '#0D9488', order: 6,  isDefault: true, keywords: ['mess','canteen','tiffin','thali'] },
  { id: uuid(), type: 'expense', name: 'Books & Stationery', icon: 'BookOpen',        color: '#4F46E5', order: 7,  isDefault: true, keywords: ['book','books','stationery','pen','pencil','notebook','notes','stationary'] },
  { id: uuid(), type: 'expense', name: 'Course / Tuition',   icon: 'GraduationCap',   color: '#00BFA6', order: 8,  isDefault: true, keywords: ['course','tuition','coaching','fees','class','tutorial','udemy','coursera'] },
  { id: uuid(), type: 'expense', name: 'Printouts & Copies', icon: 'Printer',         color: '#7A9CBF', order: 9,  isDefault: true, keywords: ['print','photocopy','xerox','copies','printout','scan'] },
  { id: uuid(), type: 'expense', name: 'Mobile Recharge',    icon: 'Smartphone',      color: '#16A34A', order: 10, isDefault: true, keywords: ['recharge','mobile','phone','sim','prepaid','airtel','jio','vi'] },
  { id: uuid(), type: 'expense', name: 'Internet / Data',    icon: 'Wifi',            color: '#2563EB', order: 11, isDefault: true, keywords: ['internet','wifi','data','broadband','net'] },
  { id: uuid(), type: 'expense', name: 'Subscriptions',      icon: 'Repeat',          color: '#4F46E5', order: 12, isDefault: true, keywords: ['subscription','netflix','spotify','youtube','prime','hotstar','notion','premium'] },
  { id: uuid(), type: 'expense', name: 'Shopping',           icon: 'ShoppingBag',     color: '#D4183D', order: 13, isDefault: true, keywords: ['shopping','amazon','flipkart','meesho','myntra','online','order'] },
  { id: uuid(), type: 'expense', name: 'Clothing',           icon: 'Shirt',           color: '#7A9CBF', order: 14, isDefault: true, keywords: ['clothes','clothing','shirt','jeans','dress','outfit','wear','fashion'] },
  { id: uuid(), type: 'expense', name: 'Fun & Outings',      icon: 'PartyPopper',     color: '#D97706', order: 15, isDefault: true, keywords: ['fun','outing','party','hangout','trip','picnic','event'] },
  { id: uuid(), type: 'expense', name: 'Movies',             icon: 'Film',            color: '#1F3B6F', order: 16, isDefault: true, keywords: ['movie','movies','cinema','theatre','film','show','bookmyshow'] },
  { id: uuid(), type: 'expense', name: 'Gaming',             icon: 'Gamepad2',        color: '#4F46E5', order: 17, isDefault: true, keywords: ['game','gaming','steam','bgmi','pubg','freefire','valorant','cod'] },
  { id: uuid(), type: 'expense', name: 'Health',             icon: 'Heart',           color: '#D4183D', order: 18, isDefault: true, keywords: ['health','medicine','doctor','hospital','pharmacy','medical','tablet','injection'] },
  { id: uuid(), type: 'expense', name: 'Gym / Sports',       icon: 'Dumbbell',        color: '#0D9488', order: 19, isDefault: true, keywords: ['gym','sports','fitness','exercise','yoga','workout','football','cricket'] },
  { id: uuid(), type: 'expense', name: 'Travel',             icon: 'Plane',           color: '#2563EB', order: 20, isDefault: true, keywords: ['travel','flight','train','bus','trip','vacation','holiday','booking'] },
  { id: uuid(), type: 'expense', name: 'Gifts',              icon: 'Gift',            color: '#FF7A59', order: 21, isDefault: true, keywords: ['gift','present','birthday','anniversary'] },
  { id: uuid(), type: 'expense', name: 'Friends & Social',   icon: 'Users',           color: '#1F3B6F', order: 22, isDefault: true, keywords: ['friends','social','hangout','split','dutch','pay'] },
  { id: uuid(), type: 'expense', name: 'Other',              icon: 'MoreHorizontal',  color: '#475569', order: 23, isDefault: true, keywords: ['other','misc','miscellaneous','etc'] },
]

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: uuid(), type: 'income', name: 'Pocket Money',       icon: 'Wallet',           color: '#00BFA6', order: 0, isDefault: true, keywords: ['pocket money','allowance','parents','monthly'] },
  { id: uuid(), type: 'income', name: 'Stipend / Intern',   icon: 'Briefcase',        color: '#1F3B6F', order: 1, isDefault: true, keywords: ['stipend','internship','intern','fellowship'] },
  { id: uuid(), type: 'income', name: 'Part-time',          icon: 'Clock',            color: '#2563EB', order: 2, isDefault: true, keywords: ['part-time','parttime','part time','job','work'] },
  { id: uuid(), type: 'income', name: 'Freelance',          icon: 'Code2',            color: '#0D9488', order: 3, isDefault: true, keywords: ['freelance','freelancing','project','client','gig'] },
  { id: uuid(), type: 'income', name: 'Scholarship',        icon: 'GraduationCap',    color: '#16A34A', order: 4, isDefault: true, keywords: ['scholarship','merit','award','grant'] },
  { id: uuid(), type: 'income', name: 'Gift / Family',      icon: 'Gift',             color: '#FF7A59', order: 5, isDefault: true, keywords: ['gift','family','birthday','received','got'] },
  { id: uuid(), type: 'income', name: 'Refund',             icon: 'RefreshCw',        color: '#7A9CBF', order: 6, isDefault: true, keywords: ['refund','return','cashback','reimbursement'] },
  { id: uuid(), type: 'income', name: 'Other Income',       icon: 'PlusCircle',       color: '#475569', order: 7, isDefault: true, keywords: ['other','income','salary','earnings'] },
]

/* ─── Default Accounts ─────────────────────── */

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: uuid(), name: 'Cash',       kind: 'cash', openingBalance: 0, createdAt: Date.now() },
  { id: uuid(), name: 'UPI / Bank', kind: 'upi',  openingBalance: 0, createdAt: Date.now() },
  { id: uuid(), name: 'Card',       kind: 'card', openingBalance: 0, createdAt: Date.now() },
]

/* ─── Default Settings ─────────────────────── */

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  currency: 'INR',
  locale: 'en-IN',
  theme: 'dark',
  cycleStartDay: 1,
  streakEnabled: true,
  schemaVersion: 1,
}
