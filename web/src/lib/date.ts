export function toDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isEqualDay(d1: Date, d2: Date): boolean {
  return (d1.getDay() === d2.getDay() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear());
}

export function isEqualMonth(d1: Date, d2: Date): boolean {
  return (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear());
}

export function nowAsISOString(): string {
  return new Date(Date.now()).toISOString()
}

export function substractYears(date: Date, delta: number): Date {
  let pd = new Date(date);
  pd.setFullYear(pd.getFullYear() - delta);
  return pd;
}