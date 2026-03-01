# SIOMS — School Internal Operations Management System

A full-featured, production-ready **Next.js 14** enterprise dashboard built with TypeScript, App Router, and Recharts.

---

## 🗂️ Project Structure

```
sioms/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (metadata + global CSS)
│   │   └── page.tsx            # Entry point → renders AppShell
│   │
│   ├── components/
│   │   ├── AppShell.tsx        # Main app controller (auth, routing, dark mode)
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     # Fixed sidebar with nav groups
│   │   │   └── Navbar.tsx      # Top bar (breadcrumb, notifications, profile)
│   │   │
│   │   ├── modules/            # Page-level feature modules
│   │   │   ├── LoginPage.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Attendance.tsx
│   │   │   ├── HR.tsx
│   │   │   ├── Payroll.tsx
│   │   │   ├── Canteen.tsx     # Includes full POS system
│   │   │   ├── Inventory.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   ├── Workshop.tsx
│   │   │   └── Assets.tsx
│   │   │
│   │   └── ui/
│   │       ├── Icon.tsx        # SVG icon system (30+ icons)
│   │       └── index.tsx       # Badge, SearchBar, Pagination, Modal, KPICard, Tabs
│   │
│   ├── data/
│   │   └── mockData.ts         # All mock data (employees, inventory, etc.)
│   │
│   ├── lib/
│   │   └── toast.tsx           # Toast notification system (context + provider)
│   │
│   ├── styles/
│   │   └── globals.css         # Full design system (CSS variables, dark mode)
│   │
│   └── types/
│       └── index.ts            # TypeScript interfaces for all entities
│
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:**
- Email: `admin@school.edu.eg`
- Password: `admin123`

---

## 📦 Tech Stack

| Tool | Purpose |
|------|---------|
| **Next.js 14** | Framework (App Router) |
| **TypeScript** | Type safety |
| **Recharts** | Charts & data visualization |
| **CSS Variables** | Design system + dark mode |
| **Google Fonts** | DM Sans + Sora |

---

## ✨ Modules

| Module | Features |
|--------|---------|
| **Dashboard** | KPIs, revenue chart, attendance donut, activity feed |
| **Attendance** | Daily register, date filter, status tracking |
| **HR** | Employee directory, leave requests, penalties |
| **Payroll** | Salary breakdown, payslip modal, export |
| **Canteen** | POS system, cart, hourly revenue chart, product manager |
| **Inventory** | 200 items, category filter, low-stock alerts |
| **Suppliers** | Directory, purchase orders, ratings |
| **Workshop** | Equipment registry, maintenance schedule, student assignments |
| **Assets** | Custody tracking, history timeline |

---

## 🎨 Design System

All design tokens are CSS variables in `globals.css`:

```css
--primary, --primary-light, --primary-dark
--accent, --accent2
--success, --warning, --danger
--bg, --surface, --surface2
--border, --text, --text2, --text3
--shadow, --shadow-card
--radius, --transition
```

Dark mode is applied by toggling `.dark` class on `<html>`.

---

## 🔧 Adding a New Module

1. Create `src/components/modules/YourModule.tsx`
2. Add a nav item to `src/components/layout/Sidebar.tsx` (`NAV_ITEMS` array)
3. Register in `src/components/AppShell.tsx` (`PAGE_MAP`)
4. Add types to `src/types/index.ts` and data to `src/data/mockData.ts`
