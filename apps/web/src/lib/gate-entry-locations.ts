export const STORAGE_LOCATIONS: string[] = [
  ...Array.from({ length: 20 }, (_, i) => `First Floor Rack ${i + 1}`),
  'Production/Shop Floor',
  'Ground Floor',
  '2nd Floor',
  '3rd Floor',
  'Stock Transfer',
  'Store Cabin',
];
