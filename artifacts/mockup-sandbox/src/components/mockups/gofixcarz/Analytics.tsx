import React, { useState } from 'react';
import { Home, CalendarClock, Wrench, BarChart2, MoreHorizontal, ArrowUpRight } from 'lucide-react';

export default function Analytics() {
  const [activePeriod, setActivePeriod] = useState('30D');

  return (
    <div className="w-[390px] h-[844px] overflow-hidden bg-[#F8FAFC] relative flex flex-col font-['Inter']">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Page header */}
        <div className="bg-white px-4 pt-10 pb-3 border-b border-[#F1F5F9]">
          <h1 className="text-xl font-bold text-[#0F172A]">Analytics</h1>
          <p className="text-xs text-[#64748B]">Performance overview</p>
        </div>

        {/* Time period toggle */}
        <div className="mx-4 mt-3 bg-[#F1F5F9] rounded-xl p-1 flex">
          {['7D', '30D', '90D'].map(period => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                activePeriod === period
                  ? 'bg-white shadow-sm text-[#0F172A] font-semibold'
                  : 'text-[#94A3B8] font-medium hover:text-[#64748B]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* KPI summary row */}
        <div className="px-4 mt-3 gap-3 flex">
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] text-[#64748B] mb-1">Revenue</p>
            <p className="text-lg font-bold text-[#0F172A]">₹3.24L</p>
            <p className="text-[10px] text-[#059669] flex items-center justify-center mt-0.5 font-medium">
              <ArrowUpRight size={10} className="mr-0.5" /> +12%
            </p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] text-[#64748B] mb-1">Jobs Done</p>
            <p className="text-lg font-bold text-[#0F172A]">186</p>
            <p className="text-[10px] text-[#059669] flex items-center justify-center mt-0.5 font-medium">
              <ArrowUpRight size={10} className="mr-0.5" /> +8%
            </p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] text-[#64748B] mb-1">Avg Ticket</p>
            <p className="text-lg font-bold text-[#0F172A]">₹1,742</p>
            <p className="text-[10px] text-[#059669] flex items-center justify-center mt-0.5 font-medium">
              <ArrowUpRight size={10} className="mr-0.5" /> +4%
            </p>
          </div>
        </div>

        {/* Revenue chart card */}
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Trend</h2>
            <p className="text-xs text-[#64748B]">₹3.24L this month</p>
          </div>
          <div className="relative w-full h-32">
            <svg viewBox="0 0 326 128" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(196,30,58,0.15)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M 0 100 Q 10 90, 20 95 T 40 85 T 60 90 T 80 70 T 100 80 T 120 60 T 140 75 T 160 50 T 180 55 T 200 35 T 220 45 T 240 25 T 260 20 T 280 30 T 300 15 T 326 10 L 326 128 L 0 128 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M 0 100 Q 10 90, 20 95 T 40 85 T 60 90 T 80 70 T 100 80 T 120 60 T 140 75 T 160 50 T 180 55 T 200 35 T 220 45 T 240 25 T 260 20 T 280 30 T 300 15 T 326 10"
                fill="none"
                stroke="#C41E3A"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Tooltip & Cursor Line */}
              <line x1="260" y1="20" x2="260" y2="128" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="260" cy="20" r="4" fill="#C41E3A" stroke="white" strokeWidth="2" />
              <g transform="translate(235, -5)">
                <rect width="50" height="20" rx="4" fill="#0F172A" />
                <text x="25" y="14" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">₹15.2K</text>
              </g>
              {/* X-Axis labels */}
              <text x="40" y="140" fill="#94A3B8" fontSize="10" textAnchor="middle">Week 1</text>
              <text x="120" y="140" fill="#94A3B8" fontSize="10" textAnchor="middle">Week 2</text>
              <text x="200" y="140" fill="#94A3B8" fontSize="10" textAnchor="middle">Week 3</text>
              <text x="280" y="140" fill="#94A3B8" fontSize="10" textAnchor="middle">Week 4</text>
            </svg>
          </div>
          <div className="h-4"></div> {/* Bottom padding for axis labels */}
        </div>

        {/* Service breakdown card */}
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-sm font-semibold text-[#0F172A]">Top Services</h2>
          <div className="mt-4 flex flex-col gap-3">
            {[
              { name: 'Full Service', percent: 42 },
              { name: 'Oil Change', percent: 28 },
              { name: 'Brake Service', percent: 14 },
              { name: 'AC Service', percent: 10 },
              { name: 'Electrical', percent: 6 },
            ].map((service, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#0F172A] w-28 truncate">{service.name}</span>
                <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C41E3A] rounded-full"
                    style={{ width: `${service.percent}%` }}
                  />
                </div>
                <span className="text-xs text-[#64748B] w-8 text-right font-medium">{service.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top stats row */}
        <div className="mx-4 mt-3 mb-4 gap-3 grid grid-cols-2">
          {/* Returning Customers */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
            <h3 className="text-xs text-[#64748B] font-medium">Returning Customers</h3>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#C41E3A"
                    strokeWidth="3.5"
                    strokeDasharray="68, 100"
                  />
                </svg>
                <div className="absolute flex items-center justify-center">
                  <span className="text-xs font-bold text-[#0F172A]">68%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[#059669] flex items-center font-medium">
                  <ArrowUpRight size={10} className="mr-0.5" /> +5%
                </p>
                <p className="text-[10px] text-[#64748B] mt-0.5">vs last mo.</p>
              </div>
            </div>
          </div>

          {/* Avg Rating */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
            <h3 className="text-xs text-[#64748B] font-medium">Avg Rating</h3>
            <div className="mt-2">
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-[#0F172A] leading-none">4.8</p>
              </div>
              <div className="flex items-center gap-0.5 mt-1.5">
                {[1, 2, 3, 4].map(star => (
                  <svg key={star} className="w-3 h-3 text-[#C41E3A]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
                {/* Half star */}
                <svg className="w-3 h-3 text-[#C41E3A]" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="halfStar">
                      <stop offset="50%" stopColor="currentColor" />
                      <stop offset="50%" stopColor="#E2E8F0" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#halfStar)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">142 reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex-shrink-0 bg-white border-t border-[#E2E8F0] h-[60px] px-2 flex items-center justify-around">
        <button className="flex flex-col items-center gap-0.5 text-[#94A3B8]">
          <Home size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[#94A3B8]">
          <CalendarClock size={20} />
          <span className="text-[10px] font-medium">Bookings</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[#94A3B8]">
          <Wrench size={20} />
          <span className="text-[10px] font-medium">Jobs</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[#C41E3A]">
          <BarChart2 size={20} color="#C41E3A" />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[#94A3B8]">
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </div>
  );
}
