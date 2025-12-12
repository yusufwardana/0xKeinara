export interface AgeDetail {
  months: number;
  days: number;
  totalDays: number;
  display: string;
}

export const calculateAge = (birthDateString: string): AgeDetail => {
  if (!birthDateString) return { months: 6, days: 0, totalDays: 180, display: '6 Bulan' };

  const birth = new Date(birthDateString);
  const now = new Date();
  
  // Reset time to avoid timezone issues affecting day diff
  birth.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months -= birth.getMonth();
  months += now.getMonth();

  // Adjust if day of month hasn't occurred yet
  if (now.getDate() < birth.getDate()) {
    months--;
  }

  // Calculate remaining days
  // Get date of the same day-of-month in the current month (or previous if not passed yet)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth(), birth.getDate());
  if (now.getDate() < birth.getDate()) {
      lastMonthDate.setMonth(now.getMonth() - 1);
  }
  
  const diffTime = Math.abs(now.getTime() - lastMonthDate.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));

  // Cap at reasonable limits for the app (3-12 months context)
  // But strictly return calculation for display
  return {
    months: Math.max(0, months),
    days: days,
    totalDays: totalDays,
    display: `${Math.max(0, months)} Bulan ${days} Hari`
  };
};