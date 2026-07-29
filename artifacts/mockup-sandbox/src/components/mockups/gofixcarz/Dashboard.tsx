import React from 'react';
import { 
  Bell, 
  Home, 
  CalendarClock, 
  Wrench, 
  BarChart2, 
  MoreHorizontal,
  ArrowUp,
  Star,
  Calendar,
  FileText
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="w-[390px] h-[844px] overflow-hidden bg-[#F8FAFC] relative flex flex-col font-['Inter']">
      
      {/* Header */}
      <header className="bg-white px-4 pt-10 pb-3 border-b border-[#F1F5F9] flex justify-between items-center flex-shrink-0">
        <div>
          <div className="text-xs text-[#64748B]">Good morning, Rajesh</div>
          <div className="text-lg font-bold text-[#0F172A] leading-tight mt-0.5">Krishna Motors</div>
        </div>
        <div className="relative cursor-pointer">
          <Bell className="w-6 h-6 text-[#0F172A]" />
          <span className="absolute -top-1 -right-1 bg-[#C41E3A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white box-content">3</span>
        </div>
      </header>

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto pb-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="text-xs text-[#64748B] mb-1.5">Today's Revenue</div>
            <div className="text-2xl font-bold text-[#C41E3A]">₹12,480</div>
            <div className="flex items-center gap-1 mt-1.5 text-[#059669]">
              <ArrowUp className="w-3 h-3" />
              <span className="text-[11px] font-medium">18% vs yesterday</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="text-xs text-[#64748B] mb-1.5">Active Jobs</div>
            <div className="text-2xl font-bold text-[#0F172A]">7</div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[#D97706]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              <span className="text-[11px] font-medium">2 urgent</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="text-xs text-[#64748B] mb-1.5">Bookings</div>
            <div className="text-2xl font-bold text-[#0F172A]">11</div>
            <div className="text-[11px] font-medium text-[#64748B] mt-1.5">4 pending</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="text-xs text-[#64748B] mb-1.5">Rating</div>
            <div className="flex items-center gap-1">
              <div className="text-2xl font-bold text-[#0F172A]">4.8</div>
              <Star className="w-4 h-4 fill-[#D97706] text-[#D97706] mb-0.5" />
            </div>
            <div className="text-[11px] font-medium text-[#64748B] mt-1.5">this month</div>
          </div>
        </div>

        {/* Sparkline */}
        <div className="bg-white rounded-2xl p-4 mx-4 mt-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-semibold text-[#0F172A]">Revenue this week</div>
          </div>
          <div className="relative h-[120px] w-full flex">
            {/* Y-axis */}
            <div className="flex flex-col justify-between h-full text-[10px] text-[#94A3B8] pr-2 pb-[20px]">
              <span>15k</span>
              <span>10k</span>
              <span>5k</span>
              <span>0</span>
            </div>
            {/* Chart Area */}
            <div className="flex-1 relative h-full">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-[20px]">
                <div className="w-full border-t border-[#F1F5F9]" />
                <div className="w-full border-t border-[#F1F5F9]" />
                <div className="w-full border-t border-[#F1F5F9]" />
                <div className="w-full border-t border-[#F1F5F9]" />
              </div>
              
              {/* SVG Chart */}
              <div className="absolute inset-0 pb-[20px]">
                <svg viewBox="0 0 280 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Area fill */}
                  <path 
                    d="M 0,80 L 46.6,60 L 93.3,75 L 140,40 L 186.6,50 L 233.3,20 L 280,30 L 280,100 L 0,100 Z" 
                    fill="rgba(196,30,58,0.06)" 
                  />
                  {/* Line */}
                  <path 
                    d="M 0,80 L 46.6,60 L 93.3,75 L 140,40 L 186.6,50 L 233.3,20 L 280,30" 
                    fill="none" 
                    stroke="#C41E3A" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Current day dot (Sun/280px) */}
                  <circle cx="280" cy="30" r="4.5" fill="#C41E3A" stroke="#FFFFFF" strokeWidth="2" />
                </svg>
              </div>

              {/* X-axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-[#94A3B8]">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span className="font-semibold text-[#0F172A]">Sun</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button className="bg-white border border-[#E2E8F0] rounded-full px-4 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8FAFC]">
              <Calendar className="w-4 h-4 text-[#64748B]" />
              <span className="text-[13px] font-semibold text-[#0F172A]">New Booking</span>
            </button>
            <button className="bg-white border border-[#E2E8F0] rounded-full px-4 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8FAFC]">
              <Wrench className="w-4 h-4 text-[#64748B]" />
              <span className="text-[13px] font-semibold text-[#0F172A]">Create Job</span>
            </button>
            <button className="bg-white border border-[#E2E8F0] rounded-full px-4 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8FAFC]">
              <FileText className="w-4 h-4 text-[#64748B]" />
              <span className="text-[13px] font-semibold text-[#0F172A]">Invoice</span>
            </button>
            <button className="bg-white border border-[#E2E8F0] rounded-full px-4 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8FAFC]">
              <BarChart2 className="w-4 h-4 text-[#64748B]" />
              <span className="text-[13px] font-semibold text-[#0F172A]">Reports</span>
            </button>
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="mt-5 mb-3 px-4 flex justify-between items-center">
          <h2 className="text-sm font-bold text-[#0F172A]">Today's Jobs</h2>
          <button className="text-[13px] font-semibold text-[#C41E3A]">See all</button>
        </div>

        <div className="flex flex-col gap-2.5 mx-4">
          {/* Job 1 */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex overflow-hidden relative cursor-pointer active:bg-gray-50">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0284C7]" />
            <div className="p-3 pl-4 w-full flex justify-between items-start">
              <div>
                <div className="text-[11px] font-medium text-[#94A3B8] mb-0.5">JC-042</div>
                <div className="text-[13px] font-bold text-[#0F172A]">Maruti Swift <span className="font-normal text-[#94A3B8] mx-0.5">·</span> Oil Change</div>
                <div className="text-xs text-[#64748B] mt-1">Ravi Tech</div>
              </div>
              <div className="bg-[#F0F9FF] text-[#0284C7] text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5">
                In Progress
              </div>
            </div>
          </div>

          {/* Job 2 */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex overflow-hidden relative cursor-pointer active:bg-gray-50">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#059669]" />
            <div className="p-3 pl-4 w-full flex justify-between items-start">
              <div>
                <div className="text-[11px] font-medium text-[#94A3B8] mb-0.5">JC-041</div>
                <div className="text-[13px] font-bold text-[#0F172A]">Honda Activa <span className="font-normal text-[#94A3B8] mx-0.5">·</span> Full Service</div>
                <div className="text-xs text-[#64748B] mt-1">Suresh</div>
              </div>
              <div className="bg-[#ECFDF5] text-[#059669] text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5">
                Completed
              </div>
            </div>
          </div>

          {/* Job 3 */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex overflow-hidden relative cursor-pointer active:bg-gray-50">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#D97706]" />
            <div className="p-3 pl-4 w-full flex justify-between items-start">
              <div>
                <div className="text-[11px] font-medium text-[#94A3B8] mb-0.5">JC-043</div>
                <div className="text-[13px] font-bold text-[#0F172A]">Toyota Innova <span className="font-normal text-[#94A3B8] mx-0.5">·</span> Brake Check</div>
                <div className="text-xs text-[#64748B] mt-1">Unassigned</div>
              </div>
              <div className="bg-[#FFFBEB] text-[#D97706] text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5">
                Pending
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-[#E2E8F0] h-[60px] px-2 flex items-center justify-around flex-shrink-0 z-10 relative">
        <button className="flex flex-col items-center gap-0.5 w-16 text-[#C41E3A]">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 w-16 text-[#94A3B8] hover:text-[#64748B]">
          <CalendarClock className="w-5 h-5" />
          <span className="text-[10px] font-medium">Bookings</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 w-16 text-[#94A3B8] hover:text-[#64748B]">
          <Wrench className="w-5 h-5" />
          <span className="text-[10px] font-medium">Jobs</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 w-16 text-[#94A3B8] hover:text-[#64748B]">
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 w-16 text-[#94A3B8] hover:text-[#64748B]">
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

    </div>
  );
}
