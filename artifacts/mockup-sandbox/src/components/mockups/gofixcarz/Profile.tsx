import React, { useState } from 'react';
import { 
  Home, 
  CalendarClock, 
  Wrench, 
  BarChart2, 
  MoreHorizontal,
  ChevronRight,
  Pencil
} from 'lucide-react';

export default function Profile() {
  const [workingHours, setWorkingHours] = useState([
    { day: 'Mon', time: '9:00 AM - 7:00 PM', active: true },
    { day: 'Tue', time: '9:00 AM - 7:00 PM', active: true },
    { day: 'Wed', time: '9:00 AM - 7:00 PM', active: true },
    { day: 'Thu', time: '9:00 AM - 7:00 PM', active: true },
    { day: 'Fri', time: '9:00 AM - 7:00 PM', active: true },
    { day: 'Sat', time: '9:00 AM - 7:00 PM', active: true },
    { day: 'Sun', time: 'Closed', active: false },
  ]);

  const toggleDay = (index: number) => {
    const newHours = [...workingHours];
    newHours[index].active = !newHours[index].active;
    setWorkingHours(newHours);
  };

  const services = [
    { name: 'Oil Change', active: true },
    { name: 'Full Service', active: true },
    { name: 'Brake Repair', active: true },
    { name: 'AC Service', active: true },
    { name: 'Electrical', active: false },
    { name: 'Tyres', active: false },
    { name: 'Denting', active: false },
    { name: 'Painting', active: false },
  ];

  return (
    <div className="w-[390px] h-[844px] overflow-hidden bg-[#F8FAFC] relative flex flex-col font-['Inter']">
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-3 border-b border-[#F1F5F9] shrink-0">
        <h1 className="text-xl font-bold text-[#0F172A]">Garage Profile</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Identity Card */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] relative">
          <button className="absolute top-3 right-3 w-8 h-8 bg-[#F8FAFC] rounded-full flex items-center justify-center border border-[#E2E8F0]">
            <Pencil className="w-4 h-4 text-[#64748B]" />
          </button>
          
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-[#FEF2F2] rounded-2xl flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-[#C41E3A]">KM</span>
            </div>
            <button className="text-xs text-[#C41E3A] font-medium mt-1">Change Photo</button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Garage Info</h2>
          </div>
          <div className="flex flex-col">
            <InfoRow label="Garage Name" value="Krishna Motors" />
            <div className="mx-4 h-px bg-[#F1F5F9]"></div>
            <InfoRow label="Owner" value="Rajesh Kumar" />
            <div className="mx-4 h-px bg-[#F1F5F9]"></div>
            <InfoRow label="Phone" value="+91 98765 43210" />
            <div className="mx-4 h-px bg-[#F1F5F9]"></div>
            <InfoRow label="Email" value="krishna@motors.in" />
          </div>
        </div>

        {/* Location Section */}
        <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Location</h2>
          </div>
          <div className="flex flex-col">
            <InfoRow label="City" value="Bengaluru" />
            <div className="mx-4 h-px bg-[#F1F5F9]"></div>
            <InfoRow label="State" value="Karnataka" />
            <div className="mx-4 h-px bg-[#F1F5F9]"></div>
            <InfoRow label="Pincode" value="560001" />
            <div className="mx-4 h-px bg-[#F1F5F9]"></div>
            <InfoRow label="Address" value="12, MG Road" truncate={true} />
          </div>
        </div>

        {/* Working Hours */}
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Working Hours</h2>
          <div className="flex flex-col gap-3">
            {workingHours.map((day, index) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm text-[#0F172A] font-medium w-12">{day.day}</span>
                <span className={`text-sm flex-1 ml-4 ${day.active ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
                  {day.time}
                </span>
                <button 
                  onClick={() => toggleDay(index)}
                  className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                    day.active ? 'bg-[#C41E3A]' : 'bg-[#E2E8F0]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    day.active ? 'transform translate-x-4' : ''
                  }`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Services Offered</h2>
          <div className="flex flex-wrap gap-2">
            {services.map(service => (
              <button 
                key={service.name}
                className={`rounded-full px-3 py-1.5 text-sm font-medium border ${
                  service.active 
                    ? 'bg-[#FEF2F2] border-[#C41E3A] text-[#C41E3A]' 
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="mx-4 mt-5 mb-2">
          <button className="w-full bg-[#C41E3A] text-white rounded-xl h-12 text-sm font-semibold flex items-center justify-center active:bg-[#A11830] transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-[#E2E8F0] h-[60px] px-2 flex items-center justify-around shrink-0 pb-safe">
        <NavTab icon={Home} label="Home" />
        <NavTab icon={CalendarClock} label="Bookings" />
        <NavTab icon={Wrench} label="Jobs" />
        <NavTab icon={BarChart2} label="Analytics" />
        <NavTab icon={MoreHorizontal} label="More" active={true} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, truncate = false }: { label: string, value: string, truncate?: boolean }) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between hover:bg-[#F8FAFC] cursor-pointer transition-colors">
      <span className="text-sm text-[#64748B] whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2 overflow-hidden ml-4">
        <span className={`text-sm text-[#0F172A] font-medium text-right ${truncate ? 'truncate' : ''}`}>
          {value}
        </span>
        <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0" />
      </div>
    </div>
  );
}

function NavTab({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className="flex flex-col items-center justify-center w-16 h-full gap-0.5 pt-1">
      <Icon className={`w-5 h-5 ${active ? 'text-[#C41E3A]' : 'text-[#94A3B8]'}`} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] font-medium ${active ? 'text-[#C41E3A]' : 'text-[#94A3B8]'}`}>
        {label}
      </span>
    </button>
  );
}