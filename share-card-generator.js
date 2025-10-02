// Share Card Generator - Create beautiful share images using Canvas

async function generateShareCard(type, data, options = {}) {
    const format = options.format || 'landscape'; // 'landscape' | 'story'
    const gridStyle = options.gridStyle || 'subtle'; // 'subtle' | 'none'

    const canvas = document.createElement('canvas');
    if (format === 'story') {
        canvas.width = 1080;
        canvas.height = 1920;
    } else {
        canvas.width = 1200;
        canvas.height = 630;
    }
    const ctx = canvas.getContext('2d');
    const PADDING = format === 'story' ? 72 : 60;

    // Get user customization
    const { data: { user } } = await supabase.auth.getUser();
    const { data: customization } = await supabase
        .from('user_customization')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const token = customization?.active_token || '🍺';
    const nameColor = customization?.name_color_hex || '#FFFFFF';
    const avatarUrl = customization?.avatar_url;

    // Background gradient + subtle radial glow
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#141416');
    gradient.addColorStop(1, '#232428');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const radial = ctx.createRadialGradient(
        Math.floor(canvas.width * 0.78),
        Math.floor(canvas.height * 0.12),
        50,
        Math.floor(canvas.width * 0.78),
        Math.floor(canvas.height * 0.12),
        Math.floor(canvas.height * 0.38)
    );
    radial.addColorStop(0, 'rgba(255,149,0,0.18)');
    radial.addColorStop(1, 'rgba(255,149,0,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle grid pattern (lighter density); allow disabling
    if (gridStyle !== 'none') {
        const spacing = format === 'story' ? 80 : 70;
        ctx.strokeStyle = 'rgba(255, 159, 28, 0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
    }

    // Brand small, top-left
    ctx.fillStyle = '#FF9F1C';
    ctx.font = `bold ${format === 'story' ? 60 : 48}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('🔒 LockIn', PADDING, PADDING + 40);

    // Load and draw profile picture if available (top-right)
    if (avatarUrl) {
        const size = format === 'story' ? 200 : 140;
        await drawProfilePicture(ctx, avatarUrl, canvas.width - PADDING - size, PADDING, size);
    }

    switch (type) {
        case 'completion':
            renderCompletionCard(ctx, data, token, nameColor);
            break;
        case 'achievement':
            renderAchievementCard(ctx, data, token, nameColor);
            break;
        case 'report':
            renderReportCard(ctx, data, token, nameColor);
            break;
        case 'milestone':
            renderMilestoneCard(ctx, data, token, nameColor);
            break;
    }

    // Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '20px Inter, sans-serif';
    const footerY = canvas.height - (format === 'story' ? 60 : 40);
    ctx.fillText('Track your discipline journey at lockin.app', PADDING, footerY);

    return canvas.toDataURL('image/png');
}

// Helper function to draw circular profile picture (with optional sizing/position)
async function drawProfilePicture(ctx, imageUrl, x = 980, y = 180, size = 180) {
    return new Promise((resolve) => {
        // Skip if no URL provided
        if (!imageUrl || imageUrl.trim() === '') {
            console.log('No profile picture URL provided');
            resolve();
            return;
        }

        const img = new Image();
        
        // Try with crossOrigin first
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                // Draw circular mask
                ctx.save();
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                
                // Draw image
                ctx.drawImage(img, x, y, size, size);
                
                ctx.restore();
                
                // Draw border
                ctx.strokeStyle = '#FF9F1C';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                ctx.stroke();
                
                console.log('✅ Profile picture loaded');
                resolve();
            } catch (err) {
                console.warn('Error drawing profile picture:', err);
                resolve();
            }
        };
        
        img.onerror = (err) => {
            console.warn('Failed to load profile picture:', err);
            // Draw placeholder circle instead
            
            ctx.fillStyle = 'rgba(255, 159, 28, 0.2)';
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FF9F1C';
            ctx.lineWidth = 4;
            ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw emoji placeholder
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '60px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👤', x + size/2, y + size/2 + 20);
            ctx.textAlign = 'left';
            
            resolve(); // Continue without image
        };
        
        img.src = imageUrl;
    });
}

function renderCompletionCard(ctx, data, token, nameColor) {
    const { username, completions, streak, discipline } = data;

    // User name with custom color
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText(username, 50, 200);

    // Stats (left side)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillText('Glass Cracked!', 50, 320);

    ctx.font = '36px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`${completions} Total Completions`, 50, 390);
    ctx.fillText(`${streak} Day Streak 🔥`, 50, 440);
    ctx.fillText(`${discipline}% Discipline Score`, 50, 490);

    // Giant token (center-right, not overlapping profile)
    ctx.font = '200px sans-serif';
    ctx.fillText(token, 650, 400);
}

function renderAchievementCard(ctx, data, token, nameColor) {
    const { username, achievementName, achievementIcon, stars, xp } = data;

    // Achievement icon
    ctx.font = '200px sans-serif';
    ctx.fillText(achievementIcon, 450, 340);

    // User name
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText(username, 50, 180);

    // Achievement unlocked text
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText('🏆 Achievement Unlocked!', 50, 270);

    // Achievement name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillText(achievementName, 50, 380);

    // Rewards
    ctx.font = '36px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`⭐ +${stars} stars  |  🎯 +${xp} XP`, 50, 450);
}

function renderReportCard(ctx, data, token, nameColor) {
    const { username, totalPL, winRate, completions, disciplineScore } = data;

    // User name
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText(username, 50, 180);

    // Title
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText('📊 Trading Report', 50, 250);

    // Stats grid
    const stats = [
        { label: 'Total P/L', value: `$${totalPL.toFixed(2)}`, color: totalPL >= 0 ? '#34C759' : '#FF453A' },
        { label: 'Win Rate', value: `${winRate}%`, color: '#FF9F1C' },
        { label: 'Completions', value: completions, color: '#FFFFFF' },
        { label: 'Discipline', value: `${disciplineScore}%`, color: disciplineScore >= 80 ? '#34C759' : '#FFC107' }
    ];

    let y = 340;
    stats.forEach(stat => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '28px Inter, sans-serif';
        ctx.fillText(stat.label, 50, y);

        ctx.fillStyle = stat.color;
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.fillText(stat.value, 400, y);

        y += 70;
    });

    // Token
    ctx.font = '120px sans-serif';
    ctx.fillText(token, 950, 400);
}

function renderMilestoneCard(ctx, data, token, nameColor) {
    const { username, milestone, message } = data;
    const pad = 60;

    // Panel background (rounded)
    const x = pad, y = 150, w = 1200 - pad * 2, h = 360, r = 18;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,149,0,0.25)';
    ctx.stroke();
    ctx.restore();

    // Username (top-left of panel)
    ctx.fillStyle = nameColor;
    ctx.textAlign = 'left';
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.fillText(username, x + 24, y + 64);

    // Center headline
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 84px Inter, sans-serif';
    ctx.fillText(milestone, x + w / 2 - 40, y + h / 2);

    // Subtext
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '42px Inter, sans-serif';
    ctx.fillText(message, x + w / 2 - 40, y + h / 2 + 56);

    // Token on right side, large but not overlapping text
    ctx.textAlign = 'right';
    ctx.font = '180px sans-serif';
    ctx.fillText(token, x + w - 24, y + h / 2 + 60);
}

// Share to platforms
async function shareCard(type, data) {
    try {
        // Save to share history
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('share_history').insert({
            user_id: user.id,
            share_type: type,
            share_data: data
        });

        // Show share modal with controls
        showShareModal(type, data);
    } catch (error) {
        console.error('Error preparing share card:', error);
        alert('Failed to open share dialog');
    }
}

async function showShareModal(type, data) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <span class="close-button" onclick="this.closest('.share-modal').remove()">&times;</span>
            <h2>Share Your Achievement 🎉</h2>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center; margin-bottom:0.75rem;">
                <div style="display:flex; gap:0.5rem;">
                    <button class="cta-secondary" id="formatLandscapeBtn">Landscape 1200×630</button>
                    <button class="cta-secondary" id="formatStoryBtn">Story 1080×1920</button>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="cta-secondary" id="gridSubtleBtn">Grid: Subtle</button>
                    <button class="cta-secondary" id="gridNoneBtn">Grid: None</button>
                </div>
            </div>
            
            <div class="share-preview">
                <img id="sharePreviewImg" src="" alt="Share card" style="max-width: 100%; border-radius: 12px; border: 2px solid var(--primary); background: rgba(0,0,0,0.2);">
            </div>
            
            <div class="share-buttons">
                <button class="cta-primary" onclick="downloadShareCard()">
                    📥 Download Image
                </button>
                <button class="cta-secondary" onclick="copyShareCard()">
                    📋 Copy Image
                </button>
            </div>
            
            <p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">
                Share on Twitter, LinkedIn, Instagram, or anywhere else!
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Local state
    let format = 'landscape';
    let gridStyle = 'subtle';

    async function refreshPreview() {
        const imgEl = document.getElementById('sharePreviewImg');
        const dataUrl = await generateShareCard(type, data, { format, gridStyle });
        imgEl.src = dataUrl;
        // Button active styles
        document.getElementById('formatLandscapeBtn').classList.toggle('cta-primary', format === 'landscape');
        document.getElementById('formatStoryBtn').classList.toggle('cta-primary', format === 'story');
        document.getElementById('gridSubtleBtn').classList.toggle('cta-primary', gridStyle === 'subtle');
        document.getElementById('gridNoneBtn').classList.toggle('cta-primary', gridStyle === 'none');
    }

    // Wire controls
    document.getElementById('formatLandscapeBtn').onclick = () => { format = 'landscape'; refreshPreview(); };
    document.getElementById('formatStoryBtn').onclick = () => { format = 'story'; refreshPreview(); };
    document.getElementById('gridSubtleBtn').onclick = () => { gridStyle = 'subtle'; refreshPreview(); };
    document.getElementById('gridNoneBtn').onclick = () => { gridStyle = 'none'; refreshPreview(); };

    // Initial render
    refreshPreview();
}

function downloadShareCard() {
    const link = document.createElement('a');
    link.download = `lockin-share-${Date.now()}.png`;
    const img = document.getElementById('sharePreviewImg');
    link.href = img?.src || '';
    link.click();
}

async function copyShareCard() {
    try {
        const img = document.getElementById('sharePreviewImg');
        const blob = await (await fetch(img?.src || '')).blob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        alert('✅ Image copied to clipboard! Paste it anywhere.');
    } catch (error) {
        console.error('Error copying image:', error);
        alert('Failed to copy. Try downloading instead.');
    }
}

// Export functions
window.generateShareCard = generateShareCard;
window.shareCard = shareCard;
window.downloadShareCard = downloadShareCard;
window.copyShareCard = copyShareCard;
