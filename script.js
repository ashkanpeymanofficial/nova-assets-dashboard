// ============================================
// Nova Assets — سیستم حسابداری جریان نقدی (Cash Flow)
// ============================================

const STORAGE_KEY = 'nova_assets_v5';
const PNL_KEY = 'nova_pnl_data_v5'; 
const HISTORY_KEY = 'nova_history_v5';

let assets = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];

// 🌟 سود و زیان از حافظه لود میشه، پس با رفرش صفر نمیشه
let pnlData = JSON.parse(localStorage.getItem(PNL_KEY)) || { totalProfit: 0, totalLoss: 0 };

let modalMode = 'edit'; 
let modalAssetId = null;

// ============================================
// منوی کشویی سفارشی
// ============================================
const selectEl = document.getElementById('assetTypeSelect');
const trigger = selectEl.querySelector('.css-select-trigger');
const options = selectEl.querySelectorAll('.css-option');
const hiddenInput = document.getElementById('assetTypeInput');
const label = document.getElementById('selectLabel');

trigger.addEventListener('click', () => selectEl.classList.toggle('open'));

options.forEach(opt => {
    opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        label.textContent = opt.textContent;
        hiddenInput.value = opt.dataset.value;
        selectEl.classList.remove('open');
        toggleCustomCurrency();
    });
});
document.addEventListener('click', (e) => { if (!selectEl.contains(e.target)) selectEl.classList.remove('open'); });

function toggleCustomCurrency() {
    const type = hiddenInput.value;
    const customRow = document.getElementById('customCurrencyRow');
    const buyLabel = document.getElementById('buyPriceLabel');
    const currLabel = document.getElementById('currentPriceLabel');

    if (type === 'custom') {
        customRow.style.display = 'flex';
        buyLabel.textContent = 'قیمت خرید هر واحد (تومان)';
        currLabel.textContent = 'قیمت فعلی بازار (تومان)';
    } else {
        customRow.style.display = 'none';
        buyLabel.textContent = type === 'gold' ? 'قیمت خرید هر گرم (تومان)' : 'قیمت خرید هر واحد (تومان)';
        currLabel.textContent = type === 'gold' ? 'قیمت فعلی طلا (تومان)' : 'قیمت فعلی بازار (تومان)';
    }
}

// ============================================
// محاسبات و رندر
// ============================================
function updateUI() {
    const list = document.getElementById('assetList');
    list.innerHTML = '';

    let totalWalletValue = 0;

    // نمایش سود و زیان کل (از حافظه)
    document.getElementById('totalProfit').textContent = pnlData.totalProfit.toLocaleString('en-US') + ' IRR';
    document.getElementById('totalLoss').textContent = pnlData.totalLoss.toLocaleString('en-US') + ' IRR';

    assets.forEach(asset => {
        totalWalletValue += asset.amount * asset.currentPrice;

        let icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'; 
        let name = 'دلار';
        let iconClass = 'dollar';
        
        if (asset.type === 'gold') { 
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'; 
            name = 'طلا'; iconClass = 'gold'; 
        } else if (asset.type === 'euro') { 
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h12M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A8 8 0 1 0 14 20a7.7 7.7 0 0 0 5-2"/></svg>'; 
            name = 'یورو'; iconClass = 'euro'; 
        } else if (asset.type === 'custom') { 
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>'; 
            name = asset.customName; iconClass = 'custom'; 
        }

        // محاسبه سود/زیان کاغذی (Unrealized) برای نمایش در کارت
        const unrealizedPnl = (asset.currentPrice - asset.buyPrice) * asset.amount;
        const unrealizedPnlPercent = asset.buyPrice > 0 ? ((asset.currentPrice - asset.buyPrice) / asset.buyPrice) * 100 : 0;
        const isProfit = unrealizedPnl >= 0;
        const pnlColor = isProfit ? 'var(--green)' : 'var(--red)';
        const pnlSign = isProfit ? '+' : '-';

        list.innerHTML += `
            <div class="asset-item">
                <div class="asset-info">
                    <div class="asset-icon-sm ${iconClass}">${icon}</div>
                    <div>
                        <div class="asset-name">${name}</div>
                        <div class="asset-detail">${asset.amount} units | Buy: ${asset.buyPrice.toLocaleString('en-US')} | Now: ${asset.currentPrice.toLocaleString('en-US')}</div>
                        <div class="asset-pnl" style="color: ${pnlColor};">
                            ${pnlSign} ${Math.abs(unrealizedPnl).toLocaleString('en-US')} IRR (${unrealizedPnlPercent.toFixed(1)}%)
                        </div>
                    </div>
                </div>
                <div class="asset-actions">
                    <button class="btn-icon" onclick="openModal('edit', ${asset.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-icon sell" onclick="openModal('sell', ${asset.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </button>
                </div>
            </div>
        `;
    });

    document.getElementById('totalBalance').textContent = totalWalletValue.toLocaleString('en-US');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    localStorage.setItem(PNL_KEY, JSON.stringify(pnlData));
}

// ============================================
// تاریخچه
// ============================================
function updateHistoryUI() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-soft); padding:20px;">تاریخچه‌ای وجود ندارد.</p>';
        return;
    }

    history.slice().reverse().forEach(item => {
        const isBuy = item.action === 'buy';
        const icon = isBuy ? 'buy' : 'sell';
        const sign = isBuy ? '-' : '+';
        const colorClass = isBuy ? 'pnl-loss' : 'pnl-profit';
        
        let pnlHtml = '';
        if (!isBuy && item.pnl !== undefined) {
            const isProfit = item.pnl >= 0;
            const pnlColor = isProfit ? 'var(--green)' : 'var(--red)';
            pnlHtml = `<div class="history-pnl" style="color: ${pnlColor}">${isProfit ? 'سود معامله:' : 'زیان معامله:'} ${Math.abs(item.pnl).toLocaleString('en-US')} IRR</div>`;
        }
        
        list.innerHTML += `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-icon ${icon}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${isBuy ? '<polyline points="12 5 12 19"/><polyline points="5 12 12 19 19 12"/>' : '<polyline points="12 19 12 5"/><polyline points="5 12 12 5 19 12"/>'}
                        </svg>
                    </div>
                    <div>
                        <div class="history-title">${isBuy ? 'خرید' : 'فروش'} ${item.name} (${item.amount} واحد)</div>
                        <div class="history-date">${item.date}</div>
                    </div>
                </div>
                <div>
                    <div class="history-amount ${colorClass}">${sign} ${item.total.toLocaleString('en-US')} IRR</div>
                    ${pnlHtml}
                </div>
            </div>
        `;
    });
}

// ============================================
// افزودن دارایی (خرید)
// ============================================
document.getElementById('addAssetForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const type = hiddenInput.value;
    const amount = parseFloat(document.getElementById('assetAmount').value);
    const buyPrice = parseFloat(document.getElementById('assetBuyPrice').value);
    const currentPrice = parseFloat(document.getElementById('assetCurrentPrice').value);
    const customName = document.getElementById('customCurrencyName').value;

    if (!amount || !buyPrice || !currentPrice) return;
    if (type === 'custom' && !customName) return alert('لطفاً نام ارز را وارد کنید.');

    let displayName = type === 'gold' ? 'طلا' : type === 'euro' ? 'یورو' : type === 'custom' ? customName : 'دلار';

    

        // 🌟 اضافه کردن مبلغ خرید به بخش زیان (خروج پول)
        const buyTotal = amount * buyPrice;
        pnlData.totalLoss += buyTotal; 

    assets.push({ 
        id: Date.now(), type: type, amount: amount, buyPrice: buyPrice, currentPrice: currentPrice, customName: customName 
    });

    history.push({
        action: 'buy',
        name: displayName,
        amount: amount,
        total: buyTotal,
        date: new Date().toLocaleString('en-GB')
    });

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    updateUI();
    updateHistoryUI();

    // ریست فرم
    document.getElementById('assetAmount').value = '';
    document.getElementById('assetBuyPrice').value = '';
    document.getElementById('assetCurrentPrice').value = '';
    document.getElementById('customCurrencyName').value = '';
});

// ============================================
// مودال ویرایش و فروش
// ============================================
function openModal(mode, id) {
    modalMode = mode;
    modalAssetId = id;
    const asset = assets.find(a => a.id === id);
    if(!asset) return;

    document.getElementById('actionModal').classList.add('active');
    
    const title = document.getElementById('modalTitle');
    const sellRow = document.getElementById('sellAmountRow');
    const editBuyRow = document.getElementById('editBuyPriceRow');
    const editCurrRow = document.getElementById('editCurrentPriceRow');

    if (mode === 'edit') {
        title.textContent = 'ویرایش دارایی';
        sellRow.style.display = 'none';
        editBuyRow.style.display = 'flex';
        editCurrRow.style.display = 'flex';
        
        document.getElementById('modalBuyPrice').value = asset.buyPrice;
        document.getElementById('modalCurrentPrice').value = asset.currentPrice;
    } else {
        title.textContent = 'فروش دارایی';
        sellRow.style.display = 'flex';
        editBuyRow.style.display = 'none';
        editCurrRow.style.display = 'none';
        
        document.getElementById('modalAmount').value = asset.amount; 
        document.getElementById('modalAmount').max = asset.amount;
    }
}

function closeModal() {
    document.getElementById('actionModal').classList.remove('active');
}

function saveModal() {
    const asset = assets.find(a => a.id === modalAssetId);
    if (!asset) return;

    if (modalMode === 'edit') {
        asset.buyPrice = parseFloat(document.getElementById('modalBuyPrice').value);
        asset.currentPrice = parseFloat(document.getElementById('modalCurrentPrice').value);
        updateUI();
    } else {
        const amountToSell = parseFloat(document.getElementById('modalAmount').value);
        if (amountToSell > asset.amount || amountToSell <= 0) return alert('مقدار فروش نامعتبر است.');

        // محاسبه مبلغ کل فروش و سود/زیان این معامله
        const sellTotal = amountToSell * asset.currentPrice;
        const sellPnl = (asset.currentPrice - asset.buyPrice) * amountToSell;

        // 🌟 آپدیت سود (فروش = ورود پول به جیب)
        pnlData.totalProfit += sellTotal;

        // 🌟 آپدیت زیان (اگر فروش با ضرر بود)
        if (sellPnl < 0) {
             pnlData.totalLoss += Math.abs(sellPnl);
        }

        // کم کردن از دارایی
        asset.amount -= amountToSell;
        if (asset.amount <= 0) assets = assets.filter(a => a.id !== asset.id);

        let displayName = asset.type === 'gold' ? 'طلا' : asset.type === 'euro' ? 'یورو' : asset.type === 'custom' ? asset.customName : 'دلار';

        history.push({
            action: 'sell',
            name: displayName,
            amount: amountToSell,
            total: sellTotal,
            pnl: sellPnl,
            date: new Date().toLocaleString('en-GB')
        });

        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        updateUI();
        updateHistoryUI();
    }
    closeModal();
}

// ============================================
// تب‌ها و شروع
// ============================================
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).style.display = 'flex';
    el.classList.add('active');

    document.getElementById('pageTitle').textContent = tabId === 'dashboard' ? 'نمای کلی دارایی' : 'تاریخچه تراکنش‌ها';
    
    if (tabId === 'history') updateHistoryUI();
}

document.addEventListener('DOMContentLoaded', () => {
    // برای اینکه دیتای قبلی با سیستم جدید قاطی نشه، یک بار رفرش کنیم
    if(!localStorage.getItem('v4_migrated')) {
        pnlData = { totalProfit: 0, totalLoss: 0 };
        localStorage.setItem('v4_migrated', 'true');
    }
    updateUI();
    updateHistoryUI();
    toggleCustomCurrency();
});