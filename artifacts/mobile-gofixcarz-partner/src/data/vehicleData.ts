/**
 * vehicleData.ts
 *
 * Temporary local vehicle brand → models mapping.
 * To switch to API-backed data:
 *   1. Create a `useVehicleData()` hook that fetches from your endpoint.
 *   2. Replace the import of VEHICLE_BRANDS_MODELS / VEHICLE_BRANDS in
 *      SelectDropdown call-sites with the hook's return values.
 *   3. No other files need to change.
 */

export const VEHICLE_BRANDS_MODELS: Record<string, string[]> = {
  'Maruti Suzuki': [
    'Alto', 'Alto K10', 'S-Presso', 'Celerio', 'WagonR',
    'Swift', 'Dzire', 'Ignis', 'Baleno', 'Ciaz',
    'Ertiga', 'XL6', 'Brezza', 'S-Cross', 'Grand Vitara',
    'Jimny', 'Invicto',
  ],
  'Hyundai': [
    'Santro', 'Grand i10 Nios', 'i20', 'Aura', 'Verna',
    'Elantra', 'Creta', 'Venue', 'Alcazar', 'Tucson',
    'Ioniq 5', 'Kona Electric',
  ],
  'Tata': [
    'Tiago', 'Tiago EV', 'Tigor', 'Altroz', 'Punch',
    'Punch EV', 'Nexon', 'Nexon EV', 'Harrier', 'Safari',
    'Curvv', 'Sierra',
  ],
  'Mahindra': [
    'KUV100 NXT', 'Bolero', 'Bolero Neo', 'TUV300',
    'Marazzo', 'XUV300', 'XUV400', 'Scorpio', 'Scorpio-N',
    'XUV700', 'Thar', 'BE6', 'XEV9e',
  ],
  'Honda': [
    'Amaze', 'City', 'City e:HEV', 'Elevate', 'WR-V', 'Jazz',
  ],
  'Toyota': [
    'Glanza', 'Urban Cruiser Taisor', 'Innova Crysta',
    'Innova HyCross', 'Fortuner', 'Legender',
    'Camry', 'Vellfire', 'Land Cruiser', 'Hilux',
  ],
  'Kia': ['Sonet', 'Seltos', 'Carens', 'EV6', 'EV9'],
  'MG': [
    'Hector', 'Hector Plus', 'Gloster', 'Astor',
    'Comet EV', 'ZS EV', 'Windsor EV',
  ],
  'Volkswagen': ['Polo', 'Vento', 'Taigun', 'Virtus', 'Tiguan'],
  'Skoda': [
    'Kushaq', 'Slavia', 'Octavia', 'Superb', 'Kodiaq', 'Karoq',
  ],
  'Renault': ['Kwid', 'Triber', 'Kiger'],
  'Nissan':  ['Magnite'],
  'Citroen': ['C3', 'C3 Aircross', 'eC3'],
  'Jeep': ['Compass', 'Meridian', 'Wrangler', 'Grand Cherokee'],
  'Ford': ['EcoSport', 'Endeavour', 'Figo', 'Aspire', 'Mustang'],
  'Isuzu': ['D-Max', 'MU-X'],
  'BMW': [
    '1 Series', '2 Series', '3 Series', '5 Series', '7 Series',
    'X1', 'X3', 'X5', 'X7', 'iX', 'i4', 'i7', 'Z4', 'M3', 'M5',
  ],
  'Mercedes-Benz': [
    'A-Class', 'C-Class', 'E-Class', 'S-Class',
    'GLA', 'GLB', 'GLC', 'GLE', 'GLS',
    'AMG GT', 'EQS', 'EQB',
  ],
  'Audi': [
    'A3', 'A4', 'A6', 'A8',
    'Q3', 'Q5', 'Q7', 'Q8',
    'e-tron', 'e-tron GT', 'TT', 'R8',
  ],
  'Land Rover': [
    'Defender', 'Discovery', 'Discovery Sport',
    'Range Rover', 'Range Rover Sport',
    'Range Rover Evoque', 'Range Rover Velar',
  ],
  'Volvo':   ['S60', 'S90', 'V60', 'XC40', 'XC60', 'XC90', 'C40'],
  'Porsche': ['Cayenne', 'Macan', 'Panamera', 'Taycan', '911', '718'],
  'Lexus':   ['ES', 'LS', 'NX', 'RX', 'UX', 'LC', 'LX'],
};

/** Sorted list of all brands — ready to pass to SelectDropdown as options. */
export const VEHICLE_BRANDS = Object.keys(VEHICLE_BRANDS_MODELS).sort();

/** Returns models for the given brand, or [] if brand is unknown. */
export function getModelsForBrand(brand: string): string[] {
  return VEHICLE_BRANDS_MODELS[brand] ?? [];
}
