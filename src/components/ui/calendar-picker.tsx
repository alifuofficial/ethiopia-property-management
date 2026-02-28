'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Globe, CalendarDays } from 'lucide-react';
import { CalendarType, ETHIOPIAN_MONTHS, GREGORIAN_MONTHS, getCurrentEthiopianDate, gregorianToEthiopian, ethiopianToGregorian, getEthiopianDaysInMonth } from '@/lib/ethiopian-calendar';

interface CalendarPickerProps {
  value: CalendarType;
  onChange: (type: CalendarType) => void;
  showLabel?: boolean;
  variant?: 'select' | 'buttons';
}

export function CalendarPicker({ 
  value, 
  onChange, 
  showLabel = true,
  variant = 'select' 
}: CalendarPickerProps) {
  if (variant === 'buttons') {
    return (
      <div className="flex items-center gap-2">
        {showLabel && <span className="text-sm text-muted-foreground">Calendar:</span>}
        <Button
          variant={value === 'gregorian' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('gregorian')}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          Gregorian
        </Button>
        <Button
          variant={value === 'ethiopian' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('ethiopian')}
          className="gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          Ethiopian
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && <span className="text-sm text-muted-foreground">Calendar:</span>}
      <Select value={value} onValueChange={(v) => onChange(v as CalendarType)}>
        <SelectTrigger className="w-[160px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gregorian">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Gregorian
            </div>
          </SelectItem>
          <SelectItem value="ethiopian">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Ethiopian (ቀን ቆጠራ)
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Ethiopian Date Picker Component
interface EthiopianDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function EthiopianDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  maxDate,
}: EthiopianDatePickerProps) {
  const ethDate = value ? gregorianToEthiopian(value) : getCurrentEthiopianDate();
  const [selectedYear, setSelectedYear] = useState(ethDate.year);
  const [selectedMonth, setSelectedMonth] = useState(ethDate.month);
  const [selectedDay, setSelectedDay] = useState(ethDate.day);

  // Generate year range (100 years back to 10 years forward)
  const currentEthYear = getCurrentEthiopianDate().year;
  const years = Array.from({ length: 110 }, (_, i) => currentEthYear - 100 + i);

  // Get days in selected month
  const daysInMonth = getEthiopianDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleDateChange = (year: number, month: number, day: number) => {
    const gregorian = ethiopianToGregorian({ year, month, day });
    const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
    
    // Check min/max constraints
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    
    onChange(date);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={selectedDay.toString()}
        onValueChange={(v) => {
          const newDay = parseInt(v);
          setSelectedDay(newDay);
          handleDateChange(selectedYear, selectedMonth, newDay);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {days.map((day) => (
            <SelectItem key={day} value={day.toString()}>
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedMonth.toString()}
        onValueChange={(v) => {
          const newMonth = parseInt(v);
          setSelectedMonth(newMonth);
          // Adjust day if needed for Pagume
          const maxDays = getEthiopianDaysInMonth(selectedYear, newMonth);
          const newDay = selectedDay > maxDays ? maxDays : selectedDay;
          setSelectedDay(newDay);
          handleDateChange(selectedYear, newMonth, newDay);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {ETHIOPIAN_MONTHS.map((month, index) => (
            <SelectItem key={index + 1} value={(index + 1).toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear.toString()}
        onValueChange={(v) => {
          const newYear = parseInt(v);
          setSelectedYear(newYear);
          handleDateChange(newYear, selectedMonth, selectedDay);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Universal Date Picker that switches between Gregorian and Ethiopian
interface UniversalDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  calendarType: CalendarType;
  onCalendarTypeChange?: (type: CalendarType) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showCalendarToggle?: boolean;
}

export function UniversalDatePicker({
  value,
  onChange,
  calendarType,
  onCalendarTypeChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  maxDate,
  showCalendarToggle = true,
}: UniversalDatePickerProps) {
  // Input type="date" for Gregorian
  const handleGregorianChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      onChange(date);
    }
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  if (calendarType === 'ethiopian') {
    return (
      <div className="flex items-center gap-2">
        <EthiopianDatePicker
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
        />
        {showCalendarToggle && onCalendarTypeChange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCalendarTypeChange('gregorian')}
            className="text-xs"
          >
            Switch to Gregorian
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleGregorianChange}
        placeholder={placeholder}
        disabled={disabled}
        min={minDate ? formatDateForInput(minDate) : undefined}
        max={maxDate ? formatDateForInput(maxDate) : undefined}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {showCalendarToggle && onCalendarTypeChange && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onCalendarTypeChange('ethiopian')}
          className="text-xs"
        >
          Switch to Ethiopian
        </Button>
      )}
    </div>
  );
}
