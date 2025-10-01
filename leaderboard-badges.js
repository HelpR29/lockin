// Fallback DOM badge applier for Achievements leaderboard
// Adds 💎 next to names if user is premium, even if original renderer lacks the flag

(async function initLeaderboardBadges() {
  try {
    if (typeof supabase === 'undefined') return;

    async function fetchPremiumMap() {
      // Attempt to get is_premium directly from the view
      const { data: rows } = await supabase
        .from('leaderboard_stats')
        .select('user_id, full_name, is_premium')
        .limit(50);

      let list = rows || [];
      // If the column is missing or null for all, enrich from user_profiles
      if (list.length && list.every(r => r.is_premium == null)) {
        const ids = list.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, is_premium')
          .in('user_id', ids);
        const map = new Map((profiles || []).map(p => [p.user_id, !!p.is_premium]));
        list = list.map(r => ({ ...r, is_premium: map.get(r.user_id) || false }));
      }
      return list;
    }

    function applyBadges(list) {
      const byName = new Map();
      list.forEach(r => byName.set((r.full_name || '').trim(), !!r.is_premium));

      // Podium
      const podiumNames = document.querySelectorAll('#podium .podium-name');
      podiumNames.forEach(el => {
        const nameOnly = (el.textContent || '').replace('💎', '').trim();
        if (byName.get(nameOnly)) {
          if (!el.querySelector('.lb-premium-badge') && !el.querySelector('[title="PREMIUM"]')) {
            const span = document.createElement('span');
            span.className = 'lb-premium-badge';
            span.textContent = ' 💎';
            span.title = 'PREMIUM';
            span.style.color = '#FFD54F';
            el.appendChild(span);
          }
        }
      });

      // Table rows
      const rows = document.querySelectorAll('#leaderboardTable .leaderboard-row:not(.leaderboard-header)');
      rows.forEach(r => {
        const cells = r.children;
        if (!cells || cells.length < 2) return;
        const nameCell = cells[1];
        const nameOnly = (nameCell.textContent || '').replace('\n', '').replace('💎', '').trim();
        if (byName.get(nameOnly)) {
          if (!nameCell.querySelector('.lb-premium-badge') && !nameCell.querySelector('[title="PREMIUM"]')) {
            const span = document.createElement('span');
            span.className = 'lb-premium-badge';
            span.textContent = ' 💎';
            span.title = 'PREMIUM';
            span.style.color = '#FFD54F';
            span.style.marginLeft = '0.25rem';
            nameCell.appendChild(span);
          }
        }
      });
    }

    async function runOnce() {
      try {
        const list = await fetchPremiumMap();
        applyBadges(list);
      } catch (_) { /* ignore */ }
    }

    // Run shortly after load and a few retries to catch late renders
    const start = Date.now();
    const timer = setInterval(() => {
      runOnce();
      if (Date.now() - start > 4000) clearInterval(timer);
    }, 500);

    // Re-apply when switching tabs (listen clicks on leaderboard tab button)
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (target && /switchTab\('leaderboard'\)/.test(target.getAttribute('onclick') || '')) {
        setTimeout(runOnce, 400);
      }
    });
  } catch (_) { /* ignore */ }
})();
