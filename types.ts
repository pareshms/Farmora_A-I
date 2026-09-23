
export enum Role {
  FARMER = 'FARMER',
  LABOUR = 'LABOUR',
  ADMIN = 'ADMIN'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY'
}

export interface Labourer {
  id: string;
  name: string;
  phone: string;
  task: string;
  dailyWage: number;
  attendance: { [date: string]: AttendanceStatus };
}

export interface CropRecord {
  id: string;
  name: string;
  area: number;
  sowingDate: string;
}

export interface HarvestRecord {
  id: string;
  cropId: string;
  cropName: string;
  qty: number;
  price: number;
  date: string;
}

export interface IncomeRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
}

export interface LoanRecord {
  id: string;
  provider: string;
  amount: number;
  rate: number;
  date: string;
  status: 'Pending' | 'Paid';
}

export interface Reminder {
  id: string;
  date: string;
  text: string;
}

export type Language = 'en' | 'hi' | 'kn' | 'te' | 'ta';

// TranslationStrings defines the shape of the localization object used in translations.ts
export interface TranslationStrings {
  [key: string]: {
    [K in Language]: string;
  };
}
