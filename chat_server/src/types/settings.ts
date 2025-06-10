import { ObjectId } from 'mongodb';

export type SettingType = 
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'radio'
  | 'color'
  | 'date'
  | 'password'
  | 'textarea'
  | 'json';

export interface SettingOption {
  label: string;
  value: string | number;
}

export interface SettingsModel {
  _id?: string;
  key: string;
  displayText?: string;
  value: any;
  type: SettingType;
  description?: string;
  category: string;
  isActive: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: SettingOption[];
  createdAt?: Date;
  updatedAt?: Date;
} 