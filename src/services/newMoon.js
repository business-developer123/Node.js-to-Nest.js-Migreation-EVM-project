const moment = require('moment');

async function getMoonPhases(year, month, day) {
  phases = ['new-moon', 'waxing-crescent-moon', 'quarter-moon', 'waxing-gibbous-moon', 'full-moon', 'waning-gibbous-moon', 'last-quarter-moon', 'waning-crescent-moon']
  let c = e = jd = b = 0;

  if (month < 3) {
    year--;
    month += 12;
  }

  ++month;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09; // jd is total days elapsed
  jd /= 29.5305882; // divide by the moon cycle
  b = parseInt(jd); // int(jd) -> b, take integer part of jd
  jd -= b; // subtract integer part to leave fractional part of original jd
  b = Math.round(jd * 8); // scale fraction from 0-8 and round

  if (b >= 8) b = 0; // 0 and 8 are the same so turn 8 into 0
  return { phase: b, name: phases[b] };
}

async function getClosestNewMoon() {
  const newMoonDates = ['8.11.2022', '9.10.2022', '10.09.2022', '11.08.2022', '12.07.2022', '01.06.2023', '02.05.2023', '03.07.2023', '04.06.2023', '05.05.2023', '06.03.2023', '07.03.2023', '08.01.2023', '08.30.2023', '09.29.2023', '10.28.2023', '11.27.2023', '12.26.2023'];
  const now = moment();
  let closestNewMoon;

  for await (newMoonDate of newMoonDates) {
    if (!closestNewMoon && moment(newMoonDate).diff(now, 'days') >= 0) {
      closestNewMoon = newMoonDate;
    }
  }
  
  return closestNewMoon;
}

module.exports = { getMoonPhases, getClosestNewMoon }