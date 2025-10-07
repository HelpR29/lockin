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

  function formatNY(date = new Date(), opts = {}) {
    const base = {
      timeZone: NY_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: undefined,
      hour12: false
    };
    return new Intl.DateTimeFormat('en-US', { ...base, ...opts }).format(date);
  }

  // Convert a New York local date/time (YYYY-MM-DD, HH:MM 24h) to a UTC ISO string
  // Works by iteratively aligning a UTC date so that its NY representation matches the input
  function nyDateTimeToUTCISO(ymd, hm) {
    try {
      const [Y, M, D] = (ymd || '').split('-').map(n => parseInt(n, 10));
      const [h, m] = (hm || '').split(':').map(n => parseInt(n, 10));
      if (!Y || !M || !D || isNaN(h) || isNaN(m)) return null;

      // Desired ET components as a UTC date baseline
      let utc = new Date(Date.UTC(Y, M - 1, D, h, m, 0, 0));

      const getEtParts = (d) => {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: NY_TZ,
          hour12: false,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        }).formatToParts(d);
        const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
        return {
          year: Number(map.year),
          month: Number(map.month),
          day: Number(map.day),
          hour: Number(map.hour),
          minute: Number(map.minute)
        };
      };

      // One or two iterations are enough
      for (let i = 0; i < 2; i++) {
        const et = getEtParts(utc);
        const desiredUTC = Date.UTC(Y, M - 1, D, h, m, 0, 0);
        const currentETasUTC = Date.UTC(et.year, et.month - 1, et.day, et.hour, et.minute, 0, 0);
        const deltaMs = desiredUTC - currentETasUTC; // minutes to adjust on UTC timeline
        if (Math.abs(deltaMs) < 60000) break; // <1 minute difference
        utc = new Date(utc.getTime() + deltaMs);
      }
      return utc.toISOString();
    } catch (e) {
      console.warn('nyDateTimeToUTCISO failed:', e);
      return null;
    }
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
  window.formatNY = formatNY;
  window.nyDateTimeToUTCISO = nyDateTimeToUTCISO;
  window.nyTimeParts = nyTimeParts;
  window.nyMinutesSinceMidnight = nyMinutesSinceMidnight;
  window.isNYMarketOpen = isNYMarketOpen;
})();
