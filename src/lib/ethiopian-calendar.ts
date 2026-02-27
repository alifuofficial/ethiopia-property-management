// Ethiopian Calendar Utility Library
// Ethiopian calendar (Ge'ez calendar) has 13 months:
// 12 months of 30 days each, plus Pagume (5 or 6 days)

export type CalendarType = 'gregorian' | 'ethiopian';

// Ethiopian month names
export const ETHIOPIAN_MONTHS = [
  'Meskerem',   // 1
  'Tikimt',     // 2
  'Hidar',      // 3
  'Tahsas',     // 4
  'Tir',        // 5
  'Yekatit',    // 6
  'Megabit',    // 7
  'Miazia',     // 8
  'Ginbot',     // 9
  'Sene',       // 10
  'Hamle',      // 11
  'Nehase',     // 12
  'Pagume',     // 13 (5 or 6 days)
] as const;

// Ethiopian month names in Amharic
export const ETHIOPIAN_MONTHS_AMHARIC = [
  'መስከረም',   // Meskerem
  'ጥቅምት',     // Tikimt
  'ኅዳር',      // Hidar
  'ታኅሣሥ',     // Tahsas
  'ጥር',        // Tir
  'የካቲት',     // Yekatit
  'መጋቢት',     // Megabit
  'ሚያዝያ',     // Miazia
  'ግንቦት',     // Ginbot
  'ሰኔ',        // Sene
  'ሐምሌ',       // Hamle
  'ነሐሴ',       // Nehase
  'ጳጉሜ',       // Pagume
] as const;

// Gregorian month names
export const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// Ethiopian weekday names
export const ETHIOPIAN_WEEKDAYS = [
  'Ehud',      // Sunday
  'Segno',     // Monday
  'Maksegno',  // Tuesday
  'Rob',       // Wednesday
  'Hamus',     // Thursday
  'Arb',       // Friday
  'Kidame',    // Saturday
] as const;

// Ethiopian weekday names in Amharic
export const ETHIOPIAN_WEEKDAYS_AMHARIC = [
  'እሑድ',      // Sunday
  'ሰኞ',        // Monday
  'ማክሰኞ',     // Tuesday
  'ረቡዕ',       // Wednesday
  'ሐሙስ',       // Thursday
  'ዓርብ',       // Friday
  'ቅዳሜ',       // Saturday
] as const;

export interface EthiopianDate {
  year: number;
  month: number; // 1-13
  day: number;   // 1-30 (or 1-5/6 for Pagume)
}

export interface GregorianDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Check if a Gregorian year is a leap year
 */
export function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Check if an Ethiopian year is a leap year
 * Ethiopian leap years occur when the Gregorian year is a leap year
 * but the rule is slightly different
 */
export function isEthiopianLeapYear(year: number): boolean {
  // Ethiopian year is leap if (year % 4) === 3
  return (year % 4) === 3;
}

/**
 * Get the number of days in an Ethiopian month
 */
export function getEthiopianDaysInMonth(year: number, month: number): number {
  if (month === 13) {
    // Pagume has 5 days in normal years, 6 in leap years
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  // All other months have 30 days
  return 30;
}

/**
 * Convert Gregorian date to Ethiopian date
 * Based on the algorithm by J. C. J. Spencer
 */
export function gregorianToEthiopian(gregorian: GregorianDate | Date): EthiopianDate {
  // If input is Date object, extract year, month, day
  const gYear = gregorian instanceof Date ? gregorian.getFullYear() : gregorian.year;
  const gMonth = gregorian instanceof Date ? gregorian.getMonth() + 1 : gregorian.month;
  const gDay = gregorian instanceof Date ? gregorian.getDate() : gregorian.day;

  // Julian Day Number calculation for Gregorian date
  const a = Math.floor((14 - gMonth) / 12);
  const y = gYear + 4800 - a;
  const m = gMonth + 12 * a - 3;
  
  let jdn = gDay + Math.floor((153 * m + 2) / 5) + 365 * y + 
            Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Ethiopian calendar epoch in JDN (August 29, 8 CE Julian = Meskerem 1, 1 Ethiopian)
  const ethiopianEpoch = 1724221;
  
  // Days since Ethiopian epoch
  const daysSinceEpoch = jdn - ethiopianEpoch;
  
  // Ethiopian year (approximate)
  let eYear = Math.floor(daysSinceEpoch / 365.25) + 1;
  
  // Days into the year
  const yearStart = ethiopianEpoch + Math.floor((eYear - 1) * 365.25);
  let daysIntoYear = jdn - yearStart;
  
  // Adjust for leap year cycle
  const cycle = Math.floor((eYear - 1) / 4);
  const remaining = (eYear - 1) % 4;
  const leapCorrection = cycle * 366 + remaining * 365;
  
  // Recalculate more precisely
  let totalDays = 0;
  let eMonth = 1;
  let eDay = 1;
  
  for (let m = 1; m <= 13; m++) {
    const daysInMonth = getEthiopianDaysInMonth(eYear, m);
    if (daysIntoYear < daysInMonth) {
      eMonth = m;
      eDay = daysIntoYear + 1;
      break;
    }
    daysIntoYear -= daysInMonth;
  }

  return { year: eYear, month: eMonth, day: eDay };
}

/**
 * Convert Ethiopian date to Gregorian date
 */
export function ethiopianToGregorian(ethiopian: EthiopianDate): GregorianDate {
  const { year: eYear, month: eMonth, day: eDay } = ethiopian;

  // Calculate Julian Day Number for Ethiopian date
  const ethiopianEpoch = 1724221; // JDN for Meskerem 1, 1 Ethiopian
  
  // Days from Ethiopian epoch
  const previousYears = eYear - 1;
  const leapYears = Math.floor(previousYears / 4);
  const normalYears = previousYears - leapYears;
  
  let daysFromEpoch = leapYears * 366 + normalYears * 365;
  
  // Add days for completed months in current year
  for (let m = 1; m < eMonth; m++) {
    daysFromEpoch += getEthiopianDaysInMonth(eYear, m);
  }
  
  // Add days in current month
  daysFromEpoch += eDay - 1;
  
  const jdn = ethiopianEpoch + daysFromEpoch;
  
  // Convert JDN to Gregorian
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  
  const gDay = e - Math.floor((153 * m + 2) / 5) + 1;
  const gMonth = m + 3 - 12 * Math.floor(m / 10);
  const gYear = 100 * b + d - 4800 + Math.floor(m / 10);
  
  return { year: gYear, month: gMonth, day: gDay };
}

/**
 * Format Ethiopian date as string
 */
export function formatEthiopianDate(
  date: EthiopianDate, 
  format: 'short' | 'long' | 'amharic' = 'short'
): string {
  const { year, month, day } = date;
  
  if (format === 'amharic') {
    return `${day} ${ETHIOPIAN_MONTHS_AMHARIC[month - 1]} ${year}`;
  } else if (format === 'long') {
    return `${day} ${ETHIOPIAN_MONTHS[month - 1]} ${year}`;
  } else {
    return `${day}/${month}/${year}`;
  }
}

/**
 * Format Gregorian date as string
 */
export function formatGregorianDate(
  date: GregorianDate | Date,
  format: 'short' | 'long' = 'short'
): string {
  const gYear = date instanceof Date ? date.getFullYear() : date.year;
  const gMonth = date instanceof Date ? date.getMonth() + 1 : date.month;
  const gDay = date instanceof Date ? date.getDate() : date.day;
  
  if (format === 'long') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    return `${gDay} ${monthNames[gMonth - 1]} ${gYear}`;
  } else {
    return `${gDay}/${gMonth}/${gYear}`;
  }
}

/**
 * Get current Ethiopian date
 */
export function getCurrentEthiopianDate(): EthiopianDate {
  return gregorianToEthiopian(new Date());
}

/**
 * Get current Gregorian date
 */
export function getCurrentGregorianDate(): GregorianDate {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Format date according to calendar type
 */
export function formatDateByCalendar(
  date: Date | GregorianDate,
  calendarType: CalendarType,
  format: 'short' | 'long' | 'amharic' = 'short'
): string {
  if (calendarType === 'ethiopian') {
    const ethDate = date instanceof Date 
      ? gregorianToEthiopian(date) 
      : gregorianToEthiopian(date);
    return formatEthiopianDate(ethDate, format === 'amharic' ? 'amharic' : format);
  } else {
    return formatGregorianDate(date instanceof Date ? date : ethiopianToGregorian(date as EthiopianDate), format);
  }
}

/**
 * Get Ethiopian year range for a given Gregorian year range
 */
export function getEthiopianYearRange(gregorianStartYear: number, gregorianEndYear: number): { start: number; end: number } {
  const startEth = gregorianToEthiopian({ year: gregorianStartYear, month: 1, day: 1 });
  const endEth = gregorianToEthiopian({ year: gregorianEndYear, month: 12, day: 31 });
  return { start: startEth.year, end: endEth.year };
}

/**
 * Generate Ethiopian calendar months for a year
 */
export function getEthiopianYearMonths(year: number): Array<{ month: number; name: string; amharic: string; days: number }> {
  return ETHIOPIAN_MONTHS.map((name, index) => ({
    month: index + 1,
    name,
    amharic: ETHIOPIAN_MONTHS_AMHARIC[index],
    days: getEthiopianDaysInMonth(year, index + 1),
  }));
}

/**
 * Parse Ethiopian date string (format: DD/MM/YYYY or D MMM YYYY)
 */
export function parseEthiopianDate(dateStr: string): EthiopianDate | null {
  try {
    // Try DD/MM/YYYY format
    const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (shortMatch) {
      return {
        day: parseInt(shortMatch[1]),
        month: parseInt(shortMatch[2]),
        year: parseInt(shortMatch[3]),
      };
    }
    
    // Try "D Month YYYY" format
    const longMatch = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (longMatch) {
      const monthName = longMatch[2];
      const monthIndex = ETHIOPIAN_MONTHS.findIndex(m => 
        m.toLowerCase() === monthName.toLowerCase()
      );
      const amharicMonthIndex = ETHIOPIAN_MONTHS_AMHARIC.findIndex(m => 
        m === monthName
      );
      
      if (monthIndex !== -1 || amharicMonthIndex !== -1) {
        return {
          day: parseInt(longMatch[1]),
          month: monthIndex !== -1 ? monthIndex + 1 : amharicMonthIndex + 1,
          year: parseInt(longMatch[3]),
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the Ethiopian new year date for a given Ethiopian year
 * Ethiopian New Year is always Meskerem 1
 */
export function getEthiopianNewYear(ethYear: number): GregorianDate {
  return ethiopianToGregorian({ year: ethYear, month: 1, day: 1 });
}

/**
 * Check if a date is valid for Ethiopian calendar
 */
export function isValidEthiopianDate(date: EthiopianDate): boolean {
  const { year, month, day } = date;
  
  if (year < 1 || month < 1 || month > 13 || day < 1) {
    return false;
  }
  
  const maxDays = getEthiopianDaysInMonth(year, month);
  return day <= maxDays;
}

/**
 * Create a Date object from Ethiopian date
 */
export function ethiopianToDate(ethDate: EthiopianDate): Date {
  const greg = ethiopianToGregorian(ethDate);
  return new Date(greg.year, greg.month - 1, greg.day);
}

/**
 * Get Ethiopian date from Date object
 */
export function dateToEthiopian(date: Date): EthiopianDate {
  return gregorianToEthiopian(date);
}

/**
 * Compare two Ethiopian dates
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareEthiopianDates(date1: EthiopianDate, date2: EthiopianDate): number {
  const d1 = date1.year * 10000 + date1.month * 100 + date1.day;
  const d2 = date2.year * 10000 + date2.month * 100 + date2.day;
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Add days to an Ethiopian date
 */
export function addDaysToEthiopian(date: EthiopianDate, days: number): EthiopianDate {
  const greg = ethiopianToGregorian(date);
  const resultDate = new Date(greg.year, greg.month - 1, greg.day);
  resultDate.setDate(resultDate.getDate() + days);
  return gregorianToEthiopian(resultDate);
}

/**
 * Get today's date formatted according to calendar type
 */
export function getTodayFormatted(calendarType: CalendarType, format: 'short' | 'long' | 'amharic' = 'long'): string {
  const today = new Date();
  return formatDateByCalendar(today, calendarType, format);
}
