export const
  MaxSecond = 60,
  MaxMinute = 60,
  MaxHour = 24,
  MaxDay = 7;

export const Second = 1000,
  Minute = Second * MaxSecond,
  Hour = Minute * MaxMinute,
  Day = Hour * MaxHour,
  Week = Day * MaxDay;

export const UnitStep = 1024;

export const Byte = 1,
  KiloByte = Byte * UnitStep,
  MegaByte = KiloByte * UnitStep,
  GigaByte = MegaByte * UnitStep,
  TeraByte = GigaByte * UnitStep;

export const MaxCronInterval = 168,
  MinCronInterval = 1;