import React, { useState } from 'react';
import { Wrench, Shield, Star, Users } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');

  return (
    <div className="w-[390px] h-[844px] overflow-hidden bg-[#F8FAFC] relative flex flex-col font-['Inter']">
      {/* Top area */}
      <div className="pt-16 px-8 text-center flex-shrink-0">
        <div className="w-14 h-14 mx-auto bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-center">
          <Wrench size={28} color="#C41E3A" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] mt-4">GoFixCarz</h1>
        <p className="text-sm text-[#64748B] mt-1">Partner Portal</p>
      </div>

      {/* Main card */}
      <div className="mx-4 mt-10 bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex-shrink-0">
        <h2 className="text-xl font-bold text-[#0F172A]">Welcome back</h2>
        <p className="text-sm text-[#64748B] mt-1">Enter your mobile number to continue</p>
        
        <div className="mt-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl h-12 flex items-center px-4 gap-3 focus-within:border-[#C41E3A] focus-within:ring-1 focus-within:ring-[#C41E3A] transition-all">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-4 object-cover rounded-sm shadow-sm border border-[#E2E8F0]">
              <path fill="#f98000" d="M0 85.3h512v113.8H0z"/>
              <path fill="#fff" d="M0 199.1h512v113.8H0z"/>
              <path fill="#008000" d="M0 312.9h512v113.8H0z"/>
              <circle cx="256" cy="256" r="40" fill="#000080"/>
              <circle cx="256" cy="256" r="32" fill="#fff"/>
              <path fill="#000080" d="M256 216l2 40-2 40-2-40zm0 80l-2-40 2-40 2 40zm40-40l-40 2-40-2 40-2zm-80 0l40-2 40 2-40 2zm28.3-28.3l28.3 28.3-28.3 28.3-28.3-28.3zm-56.6 56.6l28.3-28.3 28.3 28.3-28.3 28.3zm56.6 0l-28.3-28.3-28.3 28.3 28.3 28.3zm-56.6-56.6l28.3 28.3 28.3-28.3-28.3-28.3z"/>
            </svg>
            <span className="text-sm font-medium text-[#0F172A]">+91</span>
          </div>
          <div className="w-px h-4 bg-[#E2E8F0]" />
          <input 
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            className="flex-1 bg-transparent text-sm font-medium text-[#0F172A] placeholder:text-[#94A3B8] placeholder:font-normal outline-none border-none p-0"
            maxLength={10}
          />
        </div>

        <button className="mt-4 w-full h-12 bg-[#C41E3A] hover:bg-[#A01830] active:scale-[0.98] transition-all text-white rounded-xl text-sm font-semibold flex items-center justify-center">
          Send OTP
        </button>

        <div className="mt-4 text-center">
          <span className="text-xs text-[#94A3B8]">By continuing, you agree to our </span>
          <a href="#" className="text-xs text-[#C41E3A] hover:underline font-medium">Terms & Privacy</a>
        </div>
      </div>

      {/* Sign-up link */}
      <div className="mt-6 text-center flex-shrink-0">
        <span className="text-sm text-[#64748B]">New garage owner? </span>
        <a href="#" className="text-sm text-[#C41E3A] font-semibold hover:underline">Create account</a>
      </div>

      {/* Bottom trust strip */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 px-4">
        <div className="flex items-center gap-1.5">
          <Shield size={14} color="#94A3B8" />
          <span className="text-[10px] text-[#94A3B8] font-medium">Secure Login</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={14} color="#94A3B8" />
          <span className="text-[10px] text-[#94A3B8] font-medium">4.8 Rated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={14} color="#94A3B8" />
          <span className="text-[10px] text-[#94A3B8] font-medium">2,000+ Garages</span>
        </div>
      </div>
    </div>
  );
}