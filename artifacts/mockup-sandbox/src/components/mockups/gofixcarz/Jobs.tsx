import React, { useState } from 'react';
import { Filter, Plus, Home, CalendarClock, Wrench, BarChart2, MoreHorizontal } from 'lucide-react';

export default function Jobs() {
  const [activeStage, setActiveStage] = useState('in_progress');
  const [activeTech, setActiveTech] = useState('all');

  const stages = [
    { label: 'Open', count: 3, id: 'open' },
    { label: 'In Progress', count: 5, id: 'in_progress' },
    { label: 'Quality Check', count: 2, id: 'qc' },
    { label: 'Ready', count: 3, id: 'ready' },
    { label: 'Delivered', count: 1, id: 'delivered' },
  ];

  const techs = [
    { label: 'All Techs', id: 'all' },
    { label: 'Ravi', id: 'ravi' },
    { label: 'Suresh', id: 'suresh' },
    { label: 'Anand', id: 'anand' },
    { label: 'Kumar', id: 'kumar' },
  ];

  const jobs = [
    { id: 'JC-043', vehicle: 'Maruti Swift Dzire', number: 'KA 05 AB 1234', service: 'Full Engine Service', tech: 'Ravi Kumar', est: '2 hrs' },
    { id: 'JC-044', vehicle: 'Honda Activa 6G', number: 'MH 12 XY 9876', service: 'Oil & Filter', tech: 'Suresh', est: '45 min' },
    { id: 'JC-045', vehicle: 'Toyota Innova', number: 'TN 09 CD 5678', service: 'AC Compressor', tech: 'Anand', est: '3 hrs' },
    { id: 'JC-046', vehicle: 'Hyundai i20', number: 'KA 01 ZZ 3344', service: 'Brake Pad Replace', tech: 'Kumar', est: '1 hr' },
    { id: 'JC-047', vehicle: 'TVS Jupiter', number: 'MH 04 YY 2211', service: 'Full Service', tech: 'Ravi Kumar', est: '1.5 hrs' },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="w-[390px] h-[844px] overflow-hidden bg-[#F8FAFC] relative flex flex-col font-['Inter']">
      
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-3 border-b border-[#F1F5F9] flex-shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0F172A]">Workshop</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#64748B]">Today, 14 jobs</span>
          <button className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-gray-50">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-[80px]">
        {/* Pipeline Strip */}
        <div className="mt-3 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {stages.map((stage) => {
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${
                  isActive
                    ? 'bg-[#C41E3A] text-white border-transparent'
                    : 'bg-white text-[#64748B] border-[#E2E8F0]'
                }`}
              >
                {stage.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}>
                  {stage.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Technician Filter Row */}
        <div className="mt-3 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {techs.map((tech) => {
            const isActive = activeTech === tech.id;
            return (
              <button
                key={tech.id}
                onClick={() => setActiveTech(tech.id)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${
                  isActive
                    ? 'bg-[#FFF1F3] text-[#C41E3A] border-[#C41E3A]'
                    : 'bg-white text-[#64748B] border-[#E2E8F0]'
                }`}
              >
                {tech.label}
              </button>
            );
          })}
        </div>

        {/* Jobs List */}
        <div className="mt-3 px-4 flex flex-col gap-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
              {/* Left Accent Bar */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C41E3A]" />
              
              {/* Row 1: ID & Status */}
              <div className="flex justify-between items-center pl-1">
                <span className="text-xs font-mono font-medium text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded-md">
                  {job.id}
                </span>
                <span className="bg-[#F0F9FF] text-[#0284C7] text-xs font-medium px-2.5 py-0.5 rounded-full">
                  In Progress
                </span>
              </div>

              {/* Row 2: Vehicle Info */}
              <div className="mt-3 pl-1 flex justify-between items-end">
                <div>
                  <h3 className="text-[#0F172A] text-sm font-bold">{job.vehicle}</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">{job.number}</p>
                </div>
              </div>

              {/* Row 3: Service Type */}
              <div className="mt-2 pl-1">
                <p className="text-sm text-[#64748B]">{job.service}</p>
              </div>

              {/* Row 4: Technician & Est Time */}
              <div className="mt-3 pt-3 border-t border-[#F8FAFC] flex items-center justify-between pl-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[10px] font-bold text-[#64748B]">
                    {getInitials(job.tech)}
                  </div>
                  <span className="text-xs font-medium text-[#0F172A]">{job.tech}</span>
                </div>
                <span className="text-xs text-[#94A3B8] font-medium">Est. {job.est}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <div className="absolute right-5 bottom-[76px] w-14 h-14 rounded-full bg-[#C41E3A] shadow-[0_4px_12px_rgba(196,30,58,0.3)] flex items-center justify-center cursor-pointer z-10">
        <Plus className="w-6 h-6 text-white" />
      </div>

      {/* Bottom Nav */}
      <div className="flex-shrink-0 h-[60px] bg-white border-t border-[#E2E8F0] flex items-center justify-around px-2 relative z-10">
        {[
          { icon: Home, label: 'Home', id: 'home' },
          { icon: CalendarClock, label: 'Bookings', id: 'bookings' },
          { icon: Wrench, label: 'Jobs', id: 'jobs' },
          { icon: BarChart2, label: 'Analytics', id: 'analytics' },
          { icon: MoreHorizontal, label: 'More', id: 'more' },
        ].map((tab) => {
          const isActive = tab.id === 'jobs';
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className="flex flex-col items-center justify-center w-[20%] gap-1"
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-[#C41E3A]' : 'text-[#94A3B8]'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-[#C41E3A]' : 'text-[#94A3B8]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hide scrollbars inline style for Firefox & Edge */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
