import React, { useState } from 'react';
import { 
  Home, 
  CalendarClock, 
  Wrench, 
  BarChart2, 
  MoreHorizontal, 
  Search, 
  Clock, 
  Phone 
} from 'lucide-react';

export default function Bookings() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = [
    { label: 'All', count: 24 },
    { label: 'Pending', count: 8 },
    { label: 'Confirmed', count: 12 },
    { label: 'Completed', count: 4 },
    { label: 'Cancelled', count: 1 },
  ];

  const todayBookings = [
    { name: 'Priya Sharma', vehicle: 'Honda City', service: 'Full Service', time: '10:00 AM', status: 'Confirmed' },
    { name: 'Mohan Singh', vehicle: 'Maruti Swift', service: 'Oil Change', time: '11:30 AM', status: 'Pending' },
    { name: 'Kavya Reddy', vehicle: 'TVS Jupiter', service: 'Brake Check', time: '2:00 PM', status: 'Confirmed' },
    { name: 'Arjun Nair', vehicle: 'Toyota Innova', service: 'AC Service', time: '4:30 PM', status: 'Pending' },
  ];

  const tomorrowBookings = [
    { name: 'Rajesh Kumar', vehicle: 'Hyundai i20', service: 'Full Service', time: '10:00 AM', status: 'Confirmed' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-[#FFFBEB] text-[#D97706]';
      case 'Confirmed': return 'bg-[#EFF6FF] text-[#2563EB]';
      case 'Completed': return 'bg-[#ECFDF5] text-[#059669]';
      case 'Cancelled': return 'bg-[#FEF2F2] text-[#DC2626]';
      case 'In Progress': return 'bg-[#F0F9FF] text-[#0284C7]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className="w-[390px] h-[844px] overflow-hidden bg-[#F8FAFC] relative flex flex-col font-['Inter']">
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-3 border-b border-[#F1F5F9] flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Bookings</h1>
          <div className="text-xs text-[#64748B] mt-0.5">Tuesday, 29 July</div>
        </div>
        <button className="p-2 -mr-2 text-[#0F172A]">
          <Search size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Search bar */}
        <div className="mx-4 mt-4 bg-white border border-[#E2E8F0] rounded-xl h-10 flex items-center px-3">
          <Search size={16} className="text-[#94A3B8] mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search bookings, vehicles..." 
            className="flex-1 bg-transparent outline-none text-sm text-[#0F172A] placeholder:text-[#94A3B8]"
          />
        </div>

        {/* Filter chips */}
        <div className="px-4 mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {filters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.label)}
              className={`flex-none rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter.label 
                  ? 'bg-[#C41E3A] text-white' 
                  : 'bg-white border border-[#E2E8F0] text-[#64748B]'
              }`}
            >
              {filter.label} {filter.count}
            </button>
          ))}
        </div>

        {/* Today Section */}
        <div className="px-4 mt-5 mb-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
          Today
        </div>
        
        <div className="px-4 flex flex-col gap-3">
          {todayBookings.map((booking, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FEF2F2] text-[#C41E3A] flex items-center justify-center font-semibold text-sm">
                    {getInitials(booking.name)}
                  </div>
                  <div className="font-semibold text-[#0F172A]">{booking.name}</div>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </div>
              </div>
              
              <div className="mt-2.5 flex items-center gap-1.5 text-sm text-[#64748B] pl-11">
                <span>{booking.vehicle}</span>
                <span className="w-1 h-1 rounded-full bg-[#CBD5E1]"></span>
                <span>{booking.service}</span>
              </div>
              
              <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#64748B] pl-11">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#94A3B8]" />
                    <span>{booking.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-[#94A3B8]" />
                    <span>Call</span>
                  </div>
                </div>
                <button className="text-xs text-[#C41E3A] font-medium">View</button>
              </div>
            </div>
          ))}
        </div>

        {/* Tomorrow Section */}
        <div className="px-4 mt-6 mb-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
          Tomorrow
        </div>
        
        <div className="px-4 flex flex-col gap-3">
          {tomorrowBookings.map((booking, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FEF2F2] text-[#C41E3A] flex items-center justify-center font-semibold text-sm">
                    {getInitials(booking.name)}
                  </div>
                  <div className="font-semibold text-[#0F172A]">{booking.name}</div>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </div>
              </div>
              
              <div className="mt-2.5 flex items-center gap-1.5 text-sm text-[#64748B] pl-11">
                <span>{booking.vehicle}</span>
                <span className="w-1 h-1 rounded-full bg-[#CBD5E1]"></span>
                <span>{booking.service}</span>
              </div>
              
              <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#64748B] pl-11">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#94A3B8]" />
                    <span>{booking.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-[#94A3B8]" />
                    <span>Call</span>
                  </div>
                </div>
                <button className="text-xs text-[#C41E3A] font-medium">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-[#E2E8F0] h-[60px] px-2 flex items-center justify-around shrink-0 pb-safe">
        <button className="flex flex-col items-center justify-center w-16 gap-0.5 text-[#94A3B8]">
          <Home size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center justify-center w-16 gap-0.5 text-[#C41E3A]">
          <CalendarClock size={20} />
          <span className="text-[10px] font-medium">Bookings</span>
        </button>
        <button className="flex flex-col items-center justify-center w-16 gap-0.5 text-[#94A3B8]">
          <Wrench size={20} />
          <span className="text-[10px] font-medium">Jobs</span>
        </button>
        <button className="flex flex-col items-center justify-center w-16 gap-0.5 text-[#94A3B8]">
          <BarChart2 size={20} />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
        <button className="flex flex-col items-center justify-center w-16 gap-0.5 text-[#94A3B8]">
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      {/* Global styles for hiding scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
