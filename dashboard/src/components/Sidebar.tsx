// /dashboard/src/components/Sidebar.tsx
import React from 'react';
import {
  LayoutDashboard,
  Map,
  Truck,
  Bell,
  BarChart2,
  Settings,
  LogOut,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react';

// สมมติว่านี่คือโครงสร้างของ Sidebar component ที่คุณมีอยู่
const Sidebar = () => {
  const [expanded, setExpanded] = React.useState(true);

  // เราจะเพิ่ม data-testid เข้าไปเพื่อให้ Cypress test หาเจอ
  return (
    <aside className="h-screen sticky top-0" data-testid="sidebar">
      <nav className="h-full flex flex-col bg-slate-950 border-r border-slate-700/50 shadow-sm">
        <div className="p-4 pb-2 flex justify-between items-center">
          <span
            className={`overflow-hidden transition-all ${
              expanded ? 'w-32' : 'w-0'
            }`}
          >
            <span className="font-bold text-lg">ICE-TRUCK</span>
          </span>
          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            {expanded ? <ChevronFirst /> : <ChevronLast />}
          </button>
        </div>

        <ul className="flex-1 px-3">
          {/* รายการเมนูต่างๆ สามารถใส่เพิ่มได้ที่นี่ */}
          <li className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-md p-2 flex items-center gap-3">
            <LayoutDashboard size={20} />
            <span
              className={`overflow-hidden transition-all ${expanded ? 'w-auto' : 'w-0'}`}
            >
              Dashboard
            </span>
          </li>
          <li className="rounded-md p-2 flex items-center gap-3 hover:bg-slate-800 cursor-pointer">
            <Map size={20} />
            <span
              className={`overflow-hidden transition-all ${expanded ? 'w-auto' : 'w-0'}`}
            >
              Live Map
            </span>
          </li>
          <li className="rounded-md p-2 flex items-center gap-3 hover:bg-slate-800 cursor-pointer">
            <Truck size={20} />
            <span
              className={`overflow-hidden transition-all ${expanded ? 'w-auto' : 'w-0'}`}
            >
              Trucks
            </span>
          </li>
        </ul>

        <div className="border-t border-slate-700 flex p-3">
          <div className="w-10 h-10 rounded-md bg-violet-500"></div>
          <div
            className={`
              flex justify-between items-center
              overflow-hidden transition-all ${expanded ? 'w-52 ml-3' : 'w-0'}
          `}
          >
            <div className="leading-4">
              <h4 className="font-semibold">Admin</h4>
              <span className="text-xs text-slate-500">admin@icetruck.com</span>
            </div>
            <LogOut size={20} className="cursor-pointer" />
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
