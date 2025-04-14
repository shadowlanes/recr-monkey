'use client';

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LoadingAnimation from '../../../components/loading-animation';
import { PaymentDateItem } from '@/app/types';


interface CalendarSectionProps {
  viewMode: 'month' | 'year';
  currentDate: Date;
  calendarDays: Array<{ date: Date | null; payments: PaymentDateItem[] }>;
  yearCalendar: Array<Array<{ date: Date | null; payments: PaymentDateItem[] }>>;
  handlePaymentMouseEnter: (e: React.MouseEvent, paymentItem: PaymentDateItem) => void;
  handlePaymentMouseLeave: () => void;
  toggleViewMode: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  formatViewDate: () => string;
  formatCurrency: (amount: number, currency: string) => string;
  isToday: (date: Date) => boolean;
  getMonthName: (monthIndex: number) => string;
}

export function CalendarSection({
  viewMode,
  currentDate,
  calendarDays,
  yearCalendar,
  handlePaymentMouseEnter,
  handlePaymentMouseLeave,
  toggleViewMode,
  goToPrevious,
  goToNext,
  formatViewDate,
  formatCurrency,
  isToday,
  getMonthName
}: CalendarSectionProps) {
  const renderMonthCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="calendar-container">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div 
              key={day} 
              className="text-center font-bold p-2 bg-[#fff0e6] rounded-md text-[#4e5c6f]"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day relative ${!day.date ? 'opacity-30' : ''} ${day.date && isToday(day.date) ? 'today bg-[#fff0e6] border-[#e06c00]' : ''}`}
            >
              {day.date && (
                <>
                  <div className="calendar-day-header text-[#4e5c6f]">
                    {day.date.getDate()}
                  </div>
                  <div className="calendar-day-events overflow-y-auto max-h-24">
                    {day.payments.map((paymentData, i) => (
                      <div 
                        key={i} 
                        className="event-item text-xs cursor-pointer" 
                        onMouseEnter={(e) => handlePaymentMouseEnter(e, paymentData)}
                        onMouseLeave={handlePaymentMouseLeave}
                      >
                        <div className="font-semibold">{paymentData.payment.name}</div>
                        <div>{formatCurrency(paymentData.payment.amount, paymentData.payment.currency)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderYearCalendar = () => {
    if (yearCalendar.length === 0) {
      return (
        <div className="text-center py-8">
          <LoadingAnimation size="medium" />
        </div>
      );
    }

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    return (
      <div className="year-calendar-container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {yearCalendar.map((month, monthIndex) => (
          <div key={monthIndex} className="month-container bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <h3 className="text-center font-bold mb-2 text-[#303030]">{getMonthName(monthIndex)}</h3>
            
            {/* Day headers - smaller for year view */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {dayNames.map(day => (
                <div 
                  key={day} 
                  className="text-center text-xs p-1 bg-[#fff0e6] text-[#4e5c6f] font-medium"
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days - smaller for year view */}
            <div className="grid grid-cols-7 gap-0">
              {month.map((day, dayIndex) => (
                <div 
                  key={dayIndex} 
                  className={`relative p-1 min-h-[24px] border border-gray-100 text-center ${!day.date ? 'opacity-30' : ''} ${day.date && isToday(day.date) ? 'bg-[#fff0e6]' : ''}`}
                >
                  {day.date && (
                    <>
                      <div className="text-xs text-[#4e5c6f]">{day.date.getDate()}</div>
                      {day.payments.length > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-1 bg-[#e06c00]"
                          onMouseEnter={(e) => handlePaymentMouseEnter(e, day.payments[0])}
                          onMouseLeave={handlePaymentMouseLeave}
                        ></div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Payment count for this month */}
            <div className="text-xs text-center mt-2 text-[#4e5c6f] font-medium">
              {month.reduce((count, day) => count + (day.date ? day.payments.length : 0), 0)} payments
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleViewMode}
            className="btn btn-small bg-[#fff0e6] text-[#e06c00] hover:bg-[#ffe2cf] flex items-center gap-1"
          >
            <CalendarIcon className="w-5 h-5" />
            {viewMode === 'month' ? 'Year View' : 'Month View'}
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToPrevious} 
              className="btn btn-small bg-white border border-gray-200 hover:bg-gray-50"
              aria-label="Previous period"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium text-[#303030] px-2">
              {formatViewDate()}
            </span>
            <button 
              onClick={goToNext} 
              className="btn btn-small bg-white border border-gray-200 hover:bg-gray-50"
              aria-label="Next period"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {viewMode === 'month' ? renderMonthCalendar() : renderYearCalendar()}
    </>
  );
}
