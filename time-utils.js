// Global New York Time utilities
// Provides consistent date/time handling in America/New_York across the app
(function(){
  const NY_TZ = 'America/New_York';

  function formatYMDInTZ(date = new Date(), tz = NY_TZ) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (e) {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
  }

  function todayYMD_NY() {
    return formatYMDInTZ(new Date(), NY_TZ);
  }

  function nyTimeParts(date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: NY_TZ,
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).formatToParts(date);
      const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
      return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
        second: Number(map.second)
      };
    } catch (e) {
      const d = new Date(date);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds(),
      };
    }
  }

  function nyMinutesSinceMidnight(date = new Date()) {
    const { hour, minute } = nyTimeParts(date);
    return hour * 60 + minute;
  }

  function isNYMarketOpen(date = new Date()) {
    const parts = nyTimeParts(date);
    const yyyy = parts.year, mm = String(parts.month).padStart(2, '0'), dd = String(parts.day).padStart(2, '0');
    const dayOfWeek = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`).getUTCDay(); // 0=Sun..6=Sat (approx)
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    const mins = nyMinutesSinceMidnight(date);
    // 9:30 to 16:00 ET
    return mins >= (9 * 60 + 30) && mins <= (16 * 60);
  }

  // Expose globally
  window.NY_TZ = NY_TZ;
  window.formatYMDInTZ = formatYMDInTZ;
  window.todayYMD_NY = todayYMD_NY;
  window.nyTimeParts = nyTimeParts;
  window.nyMinutesSinceMidnight = nyMinutesSinceMidnight;
  window.isNYMarketOpen = isNYMarketOpen;
})();
