import type { BookingResponse, BookingStatus } from '@/src/types';

/* Shared mock bookings — mutated in-memory by accept/reject actions on the detail screen */

const raw: BookingResponse[] = [
  {
    id: 'bk-001',
    garage_id: 'g-1',
    customer_id: 'c-1',
    vehicle_id: 'v-1',
    status: 'PENDING',
    booking_date: '2026-07-28T10:00:00.000Z',
    notes: 'Car makes a grinding noise when braking. Please inspect brake pads and rotors.',
    customer_name: 'Arjun Sharma',
    customer_mobile: '9876543210',
    service_requested: 'Brake Inspection & Service',
    created_at: '2026-07-27T08:14:00.000Z',
    updated_at: '2026-07-27T08:14:00.000Z',
  },
  {
    id: 'bk-002',
    garage_id: 'g-1',
    customer_id: 'c-2',
    vehicle_id: 'v-2',
    status: 'PENDING',
    booking_date: '2026-07-29T09:30:00.000Z',
    notes: null,
    customer_name: 'Priya Nair',
    customer_mobile: '9123456780',
    service_requested: 'Full Car Service',
    created_at: '2026-07-27T09:45:00.000Z',
    updated_at: '2026-07-27T09:45:00.000Z',
  },
  {
    id: 'bk-003',
    garage_id: 'g-1',
    customer_id: 'c-3',
    vehicle_id: null,
    status: 'ACCEPTED',
    booking_date: '2026-07-28T14:00:00.000Z',
    notes: 'AC not cooling properly. Needs gas refill.',
    customer_name: 'Rohit Verma',
    customer_mobile: '9988776655',
    service_requested: 'AC Service & Gas Refill',
    created_at: '2026-07-26T16:20:00.000Z',
    updated_at: '2026-07-26T18:00:00.000Z',
  },
  {
    id: 'bk-004',
    garage_id: 'g-1',
    customer_id: 'c-4',
    vehicle_id: 'v-4',
    status: 'ACCEPTED',
    booking_date: '2026-07-30T11:00:00.000Z',
    notes: 'Engine oil change due. Also check tyre pressure.',
    customer_name: 'Sunita Patel',
    customer_mobile: '9871234560',
    service_requested: 'Oil Change & Tyre Check',
    created_at: '2026-07-26T11:10:00.000Z',
    updated_at: '2026-07-26T12:00:00.000Z',
  },
  {
    id: 'bk-005',
    garage_id: 'g-1',
    customer_id: 'c-5',
    vehicle_id: 'v-5',
    status: 'CONVERTED',
    booking_date: '2026-07-25T10:00:00.000Z',
    notes: 'Battery dead. Car not starting.',
    customer_name: 'Kiran Menon',
    customer_mobile: '9845001234',
    service_requested: 'Battery Replacement',
    created_at: '2026-07-24T14:00:00.000Z',
    updated_at: '2026-07-25T11:30:00.000Z',
  },
  {
    id: 'bk-006',
    garage_id: 'g-1',
    customer_id: 'c-6',
    vehicle_id: 'v-6',
    status: 'CONVERTED',
    booking_date: '2026-07-24T09:00:00.000Z',
    notes: null,
    customer_name: 'Deepak Iyer',
    customer_mobile: '9900112233',
    service_requested: 'General Inspection',
    created_at: '2026-07-23T10:00:00.000Z',
    updated_at: '2026-07-24T12:00:00.000Z',
  },
  {
    id: 'bk-007',
    garage_id: 'g-1',
    customer_id: 'c-7',
    vehicle_id: null,
    status: 'REJECTED',
    booking_date: '2026-07-26T16:00:00.000Z',
    notes: 'Needs full body dent repair.',
    customer_name: 'Meera Krishnan',
    customer_mobile: '9812345670',
    service_requested: 'Body Dent Repair',
    created_at: '2026-07-25T09:00:00.000Z',
    updated_at: '2026-07-25T10:15:00.000Z',
  },
  {
    id: 'bk-008',
    garage_id: 'g-1',
    customer_id: 'c-8',
    vehicle_id: 'v-8',
    status: 'PENDING',
    booking_date: '2026-07-31T10:00:00.000Z',
    notes: 'Clutch slipping, needs inspection.',
    customer_name: 'Vijay Rangan',
    customer_mobile: '9765432100',
    service_requested: 'Clutch Inspection',
    created_at: '2026-07-27T11:00:00.000Z',
    updated_at: '2026-07-27T11:00:00.000Z',
  },
];

/* In-memory store — mutations (accept/reject) update this array */
export const MOCK_BOOKINGS: BookingResponse[] = raw.map(b => ({ ...b }));

export function getMockBooking(id: string): BookingResponse | undefined {
  return MOCK_BOOKINGS.find(b => b.id === id);
}

export function updateMockBookingStatus(id: string, status: BookingStatus) {
  const idx = MOCK_BOOKINGS.findIndex(b => b.id === id);
  if (idx !== -1) {
    MOCK_BOOKINGS[idx] = { ...MOCK_BOOKINGS[idx], status, updated_at: new Date().toISOString() };
  }
}
