'use client';

import { Calendar, Globe, CalendarDays, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarType, getCurrentEthiopianDate, getCurrentGregorianDate, formatEthiopianDate, formatGregorianDate, gregorianToEthiopian } from '@/lib/ethiopian-calendar';

interface TodayDateDisplayProps {
  calendarType: CalendarType;
  onToggle: () => void;
  showBoth?: boolean;
}

export function TodayDateDisplay({ calendarType, onToggle, showBoth = false }: TodayDateDisplayProps) {
  const ethDate = getCurrentEthiopianDate();
  const gregDate = getCurrentGregorianDate();

  if (showBoth) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Gregorian:</span>
                <span className="font-medium">{formatGregorianDate(gregDate, 'long')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ethiopian:</span>
                <span className="font-medium">{formatEthiopianDate(ethDate, 'long')}</span>
                <span className="text-sm text-primary">({formatEthiopianDate(ethDate, 'amharic')})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="gap-2"
      >
        <RefreshCw className="h-3 w-3" />
        {calendarType === 'ethiopian' ? 'Gregorian' : 'Ethiopian'}
      </Button>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        {calendarType === 'ethiopian' ? (
          <>
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{formatEthiopianDate(ethDate, 'long')}</span>
          </>
        ) : (
          <>
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{formatGregorianDate(gregDate, 'long')}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Simple formatted date component
interface FormattedDateProps {
  date: Date | string;
  calendarType: CalendarType;
  format?: 'short' | 'long' | 'amharic';
  showIcon?: boolean;
}

export function FormattedDate({ 
  date, 
  calendarType, 
  format = 'short',
  showIcon = false 
}: FormattedDateProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  let formatted: string;
  let Icon = Calendar;
  
  if (calendarType === 'ethiopian') {
    const ethD = gregorianToEthiopian(dateObj);
    formatted = formatEthiopianDate(ethD, format);
    Icon = CalendarDays;
  } else {
    formatted = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      day: 'numeric',
    });
    Icon = Globe;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      {formatted}
    </span>
  );
}
