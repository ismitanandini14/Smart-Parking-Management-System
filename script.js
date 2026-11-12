/**
 * Smart Parking Management Dashboard - Core Controller & Business Logic
 * Algorithms: Min-Heap Nearest Slot Allocation, FIFO Waitlist Queue
 */

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
    ? "http://127.0.0.1:5000"
    : "https://smart-parking-management-5.onrender.com";

async function testBackend() {
    try {
        const response = await fetch(`${API_URL}/api/status`);
        const data = await response.json();
        console.log("Connected to parking backend:", data);
    } catch (error) {
        console.error("Backend connection test failed:", error);
    }
}
// Banner Images for dynamic slider
const bannerImages = [
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1920&q=80"
];
let currentImgIndex = 0;

// State Management
let cachedSlots = [];
let currentFilter = "all";
let audioEnabled = localStorage.getItem("parking_audio") !== "disabled";
let elapsedTimerInterval = null;

/* ==========================================================================
   Initialization & Lifecycle
   ========================================================================== */

window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initClock();
    initAudioIcon();
    initKeyboardShortcuts();

    const user = localStorage.getItem("parking_user");
    const isDashboard = !window.location.pathname.includes("login.html") && !window.location.pathname.includes("register.html");
    if (!user && isDashboard) {
        window.location.href = "login.html";
        return;
    }

    const displayUserEl = document.getElementById("displayUser");
    if (displayUserEl && user) {
        displayUserEl.innerText = user;
    }

    startImageSlider();
    refreshStatus();
    renderLocalActivityTable();

    // Auto refresh every 5 seconds
    setInterval(refreshStatus, 5000);

    // Ticking elapsed seconds timer for occupied slots every second
    if (elapsedTimerInterval) clearInterval(elapsedTimerInterval);
    elapsedTimerInterval = setInterval(updateLiveSlotTimers, 1000);
});

/* ==========================================================================
   Clock & Date Display
   ========================================================================== */

function initClock() {
    function update() {
        const now = new Date();
        const timeEl = document.getElementById("clockTime");
        const dateEl = document.getElementById("clockDate");

        if (timeEl) {
            timeEl.innerText = now.toLocaleTimeString('en-US', { hour12: false });
        }
        if (dateEl) {
            dateEl.innerText = now.toLocaleDateString('en-US', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
    }
    update();
    setInterval(update, 1000);
}

/* ==========================================================================
   Image Slider
   ========================================================================== */

function startImageSlider() {
    const slider = document.getElementById("sliderImage");
    if (!slider) return;

    setInterval(() => {
        currentImgIndex = (currentImgIndex + 1) % bannerImages.length;
        slider.style.opacity = "0.2";
        setTimeout(() => {
            slider.src = bannerImages[currentImgIndex];
            slider.style.opacity = "1";
        }, 400);
    }, 6000);
}

/* ==========================================================================
   Theme Management
   ========================================================================== */

function initTheme() {
    const savedTheme = localStorage.getItem("parking_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("parking_theme", newTheme);
    updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
    const icon = document.getElementById("themeIcon");
    const text = document.getElementById("themeText");
    if (icon) icon.innerText = theme === "dark" ? "☀️" : "🌙";
    if (text) text.innerText = theme === "dark" ? "Light" : "Dark";
}

/* ==========================================================================
   Sound Feedback (Web Audio API Synthesizer)
   ========================================================================== */

function initAudioIcon() {
    const icon = document.getElementById("audioIcon");
    if (icon) {
        icon.innerText = audioEnabled ? "🔊" : "🔇";
    }
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    localStorage.setItem("parking_audio", audioEnabled ? "enabled" : "disabled");
    initAudioIcon();
    showToast(audioEnabled ? "Sound effects enabled" : "Sound effects muted", "info");
}

function playChime(type = "success") {
    if (!audioEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        if (type === "park") {
            const osc1 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(440, ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc1.connect(gain);
            gain.connect(ctx.destination);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.25);
        } else if (type === "checkout") {
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
                gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.08);
                osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
            });
        } else if (type === "error") {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.warn("Audio chime failed:", e);
    }
}

/* ==========================================================================
   Full Screen API Controller
   ========================================================================== */

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showToast(`Fullscreen error: ${err.message}`, "error");
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/* ==========================================================================
   Logout
   ========================================================================== */

function logout() {
    localStorage.removeItem("parking_user");
    window.location.href = "login.html";
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* ==========================================================================
   Random License Plate Generator
   ========================================================================== */

const stateCodes = ["DL", "HR", "MH", "UP", "KA", "TN", "GJ", "RJ"];
const alphaChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateRandomPlate() {
    const state = stateCodes[Math.floor(Math.random() * stateCodes.length)];
    const district = String(Math.floor(Math.random() * 14) + 1).padStart(2, "0");
    const letters = alphaChars[Math.floor(Math.random() * alphaChars.length)] +
        alphaChars[Math.floor(Math.random() * alphaChars.length)];
    const number = String(Math.floor(Math.random() * 9000) + 1000);

    const plate = `${state}-${district}-${letters}-${number}`;
    const input = document.getElementById("entryNumber");
    if (input) {
        input.value = plate;
        input.focus();
    }
    return plate;
}

/* ==========================================================================
   Status & Live Parking Logic
   ========================================================================== */

async function refreshStatus() {
    try {
        const response = await fetch(`${API_URL}/api/status`);
        if (!response.ok) throw new Error("Backend server unreachable");
        const data = await response.json();

        // Update Stat Cards
        document.getElementById("stat-total").innerText = data.total;
        document.getElementById("stat-free").innerText = data.available;
        document.getElementById("stat-occupied").innerText = data.occupied;
        document.getElementById("stat-wait").innerText = data.waiting_count;
        document.getElementById("stat-revenue").innerText = `₹${parseFloat(data.total_revenue).toFixed(2)}`;

        // Update Capacity Progress Meter
        updateCapacityMeter(data.total, data.occupied, data.available);

        // Save slots cache & render
        cachedSlots = data.slots || [];
        renderSlotsGrid();
        renderInteractiveMap();

        // Update Geo Locator Stats
        const geoOcc = document.getElementById("geoOccupancyText");
        const geoBays = document.getElementById("geoTotalBays");
        if (geoOcc && data.total) {
            const pct = Math.round((data.occupied / data.total) * 100);
            geoOcc.innerText = `${pct}% Full (${data.occupied}/${data.total})`;
        }
        if (geoBays) {
            geoBays.innerText = `${data.total} Active Bays`;
        }

        // Update Waitlist
        updateWaitlist(data.waiting || []);

        // Sync and render activity logs
        if (data.activities && data.activities.length > 0) {
            syncBackendActivities(data.activities);
        }

    } catch (err) {
        console.error("Failed to fetch parking status:", err);
    }
}

function updateCapacityMeter(total, occupied, available) {
    const rateText = document.getElementById("occupancyRateText");
    const progressBar = document.getElementById("occupancyProgressBar");
    const breakdown = document.getElementById("capacityBreakdown");
    const statusBadge = document.getElementById("capacityStatusBadge");

    if (total === 0) return;

    const pct = Math.round((occupied / total) * 100);
    if (rateText) rateText.innerText = `${pct}% Full`;
    if (progressBar) {
        progressBar.style.width = `${pct}%`;
        if (pct > 80) {
            progressBar.style.background = "linear-gradient(90deg, #f97316, #ef4444)";
        } else if (pct > 50) {
            progressBar.style.background = "linear-gradient(90deg, #3b82f6, #f59e0b)";
        } else {
            progressBar.style.background = "linear-gradient(90deg, #22c55e, #3b82f6)";
        }
    }

    if (breakdown) {
        breakdown.innerText = `${occupied} / ${total} Slots Occupied (${available} Free)`;
    }

    if (statusBadge) {
        if (pct >= 90) {
            statusBadge.className = "badge-danger";
            statusBadge.innerText = "Almost Full";
        } else if (pct >= 50) {
            statusBadge.className = "badge-warning";
            statusBadge.innerText = "Moderate";
        } else {
            statusBadge.className = "badge-success";
            statusBadge.innerText = "Optimal";
        }
    }
}

/* ==========================================================================
   Slots Rendering, Filtering & Live Search
   ========================================================================== */

function setFilter(filterType, buttonEl) {
    currentFilter = filterType;
    document.querySelectorAll(".filter-chips-group .chip").forEach(chip => chip.classList.remove("active"));
    if (buttonEl) buttonEl.classList.add("active");
    renderSlotsGrid();
    syncMapFilters();
}

function handleSearch() {
    const query = document.getElementById("slotSearchInput").value.trim().toUpperCase();
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) {
        clearBtn.style.display = query ? "block" : "none";
    }
    renderSlotsGrid();
    syncMapFilters();
}

function clearSearch() {
    const input = document.getElementById("slotSearchInput");
    if (input) input.value = "";
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) clearBtn.style.display = "none";
    renderSlotsGrid();
    syncMapFilters();
}

function renderSlotsGrid() {
    const grid = document.getElementById("slotsContainer");
    if (!grid) return;

    const searchQuery = (document.getElementById("slotSearchInput")?.value || "").trim().toUpperCase();
    grid.innerHTML = "";

    let displayedCount = 0;

    cachedSlots.forEach(slot => {
        // Apply Filter Chip
        if (currentFilter === "available" && slot.is_occupied) return;
        if (currentFilter === "occupied" && !slot.is_occupied) return;
        if (currentFilter === "car" && slot.type !== "Car") return;
        if (currentFilter === "bike" && slot.type !== "Bike") return;

        // Apply Search Query
        const matchesSearch = !searchQuery ||
            slot.slot_id.toUpperCase().includes(searchQuery) ||
            (slot.vehicle_no && slot.vehicle_no.toUpperCase().includes(searchQuery));

        if (searchQuery && !matchesSearch) return;

        displayedCount++;

        const card = document.createElement("div");
        card.className = `slot-card-item ${slot.is_occupied ? 'occupied' : 'free'} ${searchQuery && matchesSearch ? 'highlight-search' : ''}`;
        card.setAttribute("data-slot-id", slot.slot_id);
        card.setAttribute("data-type", slot.type);
        if (slot.entry_time) {
            card.setAttribute("data-entry-time", slot.entry_time);
        }

        const icon = slot.is_occupied
            ? (slot.type === "Car" ? "🚗" : "🏍️")
            : "🅿️";

        const ratePerHour = slot.type === "Car" ? 30 : 15;

        // On Click handler: If free, prompt direct park; If occupied, fill checkout input
        if (!slot.is_occupied) {
            card.onclick = () => openQuickPark(slot.slot_id, slot.type);
        }

        let innerHTML = `
            <div class="slot-header">
                <span class="slot-id-badge">${slot.slot_id}</span>
                <span class="slot-tag ${slot.is_occupied ? 'in-use' : 'available'}">
                    ${slot.is_occupied ? 'Occupied' : 'Available'}
                </span>
            </div>

            <div class="slot-center">
                <div class="slot-center-icon">${icon}</div>
                ${slot.is_occupied
                ? `<span class="slot-plate-text">${slot.vehicle_no}</span>`
                : `<span class="slot-empty-text">Click to Park</span>`
            }
            </div>

            <div class="slot-footer">
                <span class="slot-distance">📍 ${slot.distance}m (Gate)</span>
                ${slot.is_occupied ? `
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span class="slot-live-timer" id="timer-${slot.slot_id}">⏱️ --:-- • ₹${ratePerHour}</span>
                        <button class="btn-quick-vacate-pill" onclick="event.stopPropagation(); executeCheckout('${slot.vehicle_no}')" title="Quick Checkout">
                            Vacate
                        </button>
                    </div>
                ` : `
                    <span style="font-weight: 600; color: var(--text-muted); font-size: 11px;">${slot.type} • ₹${ratePerHour}/hr</span>
                `}
            </div>
        `;

        card.innerHTML = innerHTML;
        grid.appendChild(card);
    });

    const badge = document.getElementById("slotsCountBadge");
    if (badge) {
        badge.innerText = `Showing ${displayedCount} of ${cachedSlots.length}`;
    }

    updateLiveSlotTimers();
}

function updateLiveSlotTimers() {
    const nowSec = Date.now() / 1000;
    cachedSlots.forEach(slot => {
        if (!slot.is_occupied) return;
        const timerEl = document.getElementById(`timer-${slot.slot_id}`);
        if (!timerEl) return;

        const baseRate = slot.type === "Car" ? 30.0 : 15.0;
        const perMin = slot.type === "Car" ? 0.50 : 0.25;

        // If backend returned entry_time
        if (slot.entry_time) {
            const diffSec = Math.max(1, Math.floor(nowSec - slot.entry_time));
            const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
            const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
            const secs = String(diffSec % 60).padStart(2, "0");

            // Calculate live estimated bill matching backend logic
            let estBill = baseRate;
            const diffMins = Math.floor(diffSec / 60);
            if (diffMins > 60) {
                estBill = baseRate + ((diffMins - 60) * perMin);
            }

            const timeStr = hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
            timerEl.innerText = `⏱️ ${timeStr} • ₹${estBill.toFixed(0)}`;
        } else {
            timerEl.innerText = `⏱️ Active • ₹${baseRate.toFixed(0)}`;
        }
    });

    if (currentlyInspectedSlotId) {
        updateInspectorTimer();
    }
}

/* ==========================================================================
   Waitlist (FIFO Queue)
   ========================================================================== */

function updateWaitlist(waitingArr) {
    const waitList = document.getElementById("waitingListContainer");
    const badge = document.getElementById("queueBadge");
    if (!waitList) return;

    if (badge) badge.innerText = `${waitingArr.length} in line`;

    waitList.innerHTML = "";
    if (waitingArr.length === 0) {
        waitList.innerHTML = '<li class="empty-state">No vehicles in waitlist.</li>';
    } else {
        waitingArr.forEach((item, index) => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>#${index + 1}</strong> &nbsp; ${item}`;
            waitList.appendChild(li);
        });
    }
}

/* ==========================================================================
   Check-In & Check-Out Handlers
   ========================================================================== */

async function sendParkRequest() {
    const plate = document.getElementById("entryNumber").value.trim().toUpperCase();
    const type = document.getElementById("vehicleTypeSelect").value;
    if (!plate) {
        showToast("Please enter a valid license plate number!", "error");
        playChime("error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/park`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicle_no: plate, vehicle_type: type })
        });
        const result = await res.json();

        if (result.success) {
            showToast(result.message, "success");
            playChime("park");
            addLocalActivity("PARK", plate, type, result.message);
            document.getElementById("entryNumber").value = "";
            refreshStatus();
        } else {
            showToast(result.message, "error");
            playChime("error");
        }
    } catch (err) {
        showToast("Failed to communicate with parking server", "error");
        playChime("error");
    }
}

async function sendExitRequest() {
    const plate = document.getElementById("exitNumber").value.trim().toUpperCase();
    if (!plate) {
        showToast("Please enter a plate number to checkout!", "error");
        playChime("error");
        return;
    }
    executeCheckout(plate);
    document.getElementById("exitNumber").value = "";
}

async function executeCheckout(plate) {
    try {
        const res = await fetch(`${API_URL}/api/vacate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicle_no: plate })
        });
        const result = await res.json();

        if (result.success) {
            playChime("checkout");
            showReceipt(result.receipt);
            addLocalActivity("EXIT", plate, result.receipt.slot_type, `Slot ${result.receipt.slot_id}`, result.receipt.total_bill);
            refreshStatus();
        } else {
            showToast(result.message || "Vehicle not found in active spots", "error");
            playChime("error");
        }
    } catch (err) {
        showToast("Checkout request failed", "error");
        playChime("error");
    }
}

/* ==========================================================================
   Quick Direct Park Modal
   ========================================================================== */

function openQuickPark(slotId, slotType) {
    const modal = document.getElementById("quickParkModal");
    const sub = document.getElementById("quickParkSlotSubtitle");
    const typeInput = document.getElementById("quickParkType");
    const plateInput = document.getElementById("quickParkPlate");

    if (sub) sub.innerText = `Selected Slot: ${slotId} (${slotType})`;
    if (typeInput) typeInput.value = slotType;
    if (plateInput) {
        plateInput.value = generateRandomPlate();
        plateInput.focus();
    }
    if (modal) modal.style.display = "flex";
}

function closeQuickPark() {
    const modal = document.getElementById("quickParkModal");
    if (modal) modal.style.display = "none";
}

async function confirmQuickPark() {
    const plate = document.getElementById("quickParkPlate").value.trim().toUpperCase();
    const type = document.getElementById("quickParkType").value || "Car";

    if (!plate) {
        showToast("Please enter a license plate number!", "error");
        return;
    }

    closeQuickPark();
    const res = await fetch(`${API_URL}/api/park`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_no: plate, vehicle_type: type })
    });
    const result = await res.json();

    if (result.success) {
        showToast(result.message, "success");
        playChime("park");
        addLocalActivity("PARK", plate, type, result.message);
        refreshStatus();
    } else {
        showToast(result.message, "error");
        playChime("error");
    }
}

/* ==========================================================================
   Receipt Modal
   ========================================================================== */

function showReceipt(r) {
    document.getElementById("r-plate").innerText = r.vehicle_no;
    document.getElementById("r-slot").innerText = `${r.slot_id} (${r.slot_type})`;
    document.getElementById("r-type").innerText = r.slot_type;
    document.getElementById("r-in").innerText = r.entry_time;
    document.getElementById("r-out").innerText = r.exit_time;

    // Handle duration nicely
    const durationLabel = r.duration_str || (r.duration_hours ? `${r.duration_hours} hr(s)` : `${r.duration_sec || 0}s`);
    document.getElementById("r-dur").innerText = `${durationLabel} (Rate: ₹${r.rate}/hr)`;
    document.getElementById("r-total").innerText = `₹${parseFloat(r.total_bill).toFixed(2)}`;
    document.getElementById("receiptModal").style.display = "flex";
}

function closeReceipt() {
    document.getElementById("receiptModal").style.display = "none";
}

/* ==========================================================================
   Activity History Log & CSV Export
   ========================================================================== */

function getLocalActivities() {
    try {
        return JSON.parse(localStorage.getItem("parking_activity_history")) || [];
    } catch {
        return [];
    }
}

function addLocalActivity(actionType, plate, category, slot, bill = 0) {
    const activities = getLocalActivities();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    activities.unshift({
        time: timeStr,
        action: actionType,
        plate: plate,
        category: category,
        slot: slot,
        bill: bill > 0 ? `₹${parseFloat(bill).toFixed(2)}` : '—'
    });

    if (activities.length > 50) activities.pop();
    localStorage.setItem("parking_activity_history", JSON.stringify(activities));
    renderLocalActivityTable();
}

function syncBackendActivities(backendActivities) {
    const local = getLocalActivities();
    if (local.length === 0 && backendActivities && backendActivities.length > 0) {
        const transformed = backendActivities.map(b => ({
            time: b.time,
            action: b.type,
            plate: b.vehicle_no,
            category: b.vehicle_type,
            slot: b.slot_id,
            bill: b.bill > 0 ? `₹${parseFloat(b.bill).toFixed(2)}` : '—'
        }));
        localStorage.setItem("parking_activity_history", JSON.stringify(transformed));
        renderLocalActivityTable();
    }
}

function renderLocalActivityTable() {
    const tbody = document.getElementById("activityTableBody");
    if (!tbody) return;

    const activities = getLocalActivities();
    tbody.innerHTML = "";

    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No recent activity logged yet.</td></tr>';
        return;
    }

    activities.slice(0, 20).forEach(item => {
        const tr = document.createElement("tr");
        const badgeClass = item.action === "PARK" ? "park" : "exit";
        tr.innerHTML = `
            <td><b>${item.time}</b></td>
            <td><span class="badge-act ${badgeClass}">${item.action}</span></td>
            <td><code style="font-weight: 700;">${item.plate}</code></td>
            <td>${item.category || 'Car'}</td>
            <td>${item.slot}</td>
            <td style="font-weight: 700; color: ${item.bill !== '—' ? '#059669' : 'inherit'};">${item.bill}</td>
        `;
        tbody.appendChild(tr);
    });
}

function clearActivityLog() {
    if (confirm("Are you sure you want to clear the local activity log?")) {
        localStorage.removeItem("parking_activity_history");
        renderLocalActivityTable();
        showToast("Activity history cleared", "info");
    }
}

function exportActivityCSV() {
    const activities = getLocalActivities();
    if (activities.length === 0) {
        showToast("No activity to export!", "error");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Time,Action,Plate,Category,Slot,Billed\n";
    activities.forEach(row => {
        const cleanBill = String(row.bill).replace("₹", "");
        csvContent += `"${row.time}","${row.action}","${row.plate}","${row.category}","${row.slot}","${cleanBill}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Parking_Activity_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Activity log exported as CSV", "success");
}

/* ==========================================================================
   Keyboard Shortcuts
   ========================================================================== */

function initKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeReceipt();
            closeQuickPark();
            const aiChat = document.getElementById("aiChatWindow");
            if (aiChat) aiChat.style.display = "none";
        }

        if (e.altKey && (e.key === "p" || e.key === "P")) {
            e.preventDefault();
            const entry = document.getElementById("entryNumber");
            if (entry) {
                entry.focus();
                showToast("Short-cut: Vehicle Check-In active", "info");
            }
        }

        if (e.altKey && (e.key === "e" || e.key === "E")) {
            e.preventDefault();
            const exit = document.getElementById("exitNumber");
            if (exit) {
                exit.focus();
                showToast("Short-cut: Vehicle Check-Out active", "info");
            }
        }
    });
}

/* ==========================================================================
   AI Copilot Assistant
   ========================================================================== */

function toggleAIChat() {
    const chat = document.getElementById("aiChatWindow");
    if (!chat) return;
    const isVisible = chat.style.display === "flex";
    chat.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
        document.getElementById("aiUserInput")?.focus();
    }
}

function quickAIPrompt(text) {
    const input = document.getElementById("aiUserInput");
    if (input) {
        input.value = text;
        sendAIMessage();
    }
}

async function sendAIMessage() {
    const input = document.getElementById("aiUserInput");
    const msg = input.value.trim();
    if (!msg) return;

    const chatBox = document.getElementById("aiMessages");
    chatBox.innerHTML += `<div class="msg user">${msg}</div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/api/ai-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();

        chatBox.innerHTML += `<div class="msg bot">${data.reply.replace(/\n/g, '<br>')}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        if (data.receipt) {
            playChime("checkout");
            showReceipt(data.receipt);
            addLocalActivity("EXIT", data.receipt.vehicle_no, data.receipt.slot_type, data.receipt.slot_id, data.receipt.total_bill);
        }

        refreshStatus();
    } catch (err) {
        console.error("AI Error:", err);
        chatBox.innerHTML += `<div class="msg bot" style="color:var(--danger);">⚠️ AI Copilot is currently offline.</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

/* ==========================================================================
   Interactive Parking Map & Spatial Locations Controller
   ========================================================================== */

let currentlyInspectedSlotId = null;

/**
 * Switch between 2D Floor Plan layout and Geographic Campus Locator view
 */
function switchMapView(viewType) {
    const floorView = document.getElementById("mapViewFloor");
    const geoView = document.getElementById("mapViewGeo");
    const tabFloor = document.getElementById("mapTabFloor");
    const tabGeo = document.getElementById("mapTabGeo");

    if (!floorView || !geoView) return;

    if (viewType === "geo") {
        floorView.style.display = "none";
        geoView.style.display = "block";
        if (tabFloor) {
            tabFloor.classList.remove("active");
            tabFloor.setAttribute("aria-selected", "false");
        }
        if (tabGeo) {
            tabGeo.classList.add("active");
            tabGeo.setAttribute("aria-selected", "true");
        }
    } else {
        floorView.style.display = "block";
        geoView.style.display = "none";
        if (tabGeo) {
            tabGeo.classList.remove("active");
            tabGeo.setAttribute("aria-selected", "false");
        }
        if (tabFloor) {
            tabFloor.classList.add("active");
            tabFloor.setAttribute("aria-selected", "true");
        }
    }
}

/**
 * Main rendering loop for the interactive facility map
 */
function renderInteractiveMap() {
    const carGrid = document.getElementById("mapCarBaysGrid");
    const bikeGrid = document.getElementById("mapBikeBaysGrid");
    if (!carGrid || !bikeGrid) return;

    if (!cachedSlots || cachedSlots.length === 0) {
        carGrid.innerHTML = '<div class="map-loading-placeholder">Waiting for parking telemetry...</div>';
        bikeGrid.innerHTML = '<div class="map-loading-placeholder">Waiting for parking telemetry...</div>';
        return;
    }

    // Separate Car and Bike slots and sort by slot_id for orderly visual arrangement
    const carSlots = cachedSlots.filter(s => s.type === "Car").sort((a, b) => a.distance - b.distance);
    const bikeSlots = cachedSlots.filter(s => s.type === "Bike").sort((a, b) => a.distance - b.distance);

    // Identify Min-Heap nearest recommended slot for Cars and Bikes
    const availableCars = carSlots.filter(s => !s.is_occupied);
    const availableBikes = bikeSlots.filter(s => !s.is_occupied);

    const bestCarSlot = availableCars.length > 0 ? availableCars[0] : null;
    const bestBikeSlot = availableBikes.length > 0 ? availableBikes[0] : null;

    // Update Min-Heap Recommendation Pill in the map header
    const heapTextEl = document.getElementById("heapSlotText");
    if (heapTextEl) {
        if (bestCarSlot && bestBikeSlot) {
            heapTextEl.innerText = `Min-Heap Best: 🚗 ${bestCarSlot.slot_id} (${bestCarSlot.distance}m) • 🏍️ ${bestBikeSlot.slot_id} (${bestBikeSlot.distance}m)`;
        } else if (bestCarSlot) {
            heapTextEl.innerText = `Min-Heap Best: 🚗 ${bestCarSlot.slot_id} (${bestCarSlot.distance}m)`;
        } else if (bestBikeSlot) {
            heapTextEl.innerText = `Min-Heap Best: 🏍️ ${bestBikeSlot.slot_id} (${bestBikeSlot.distance}m)`;
        } else {
            heapTextEl.innerText = `Facility Full • Waiting Queue Active (FIFO)`;
        }
    }

    // Update Quick Stats in the legend bar
    const carStatsEl = document.getElementById("mapCarStats");
    const bikeStatsEl = document.getElementById("mapBikeStats");
    if (carStatsEl) {
        carStatsEl.innerText = `${availableCars.length}/${carSlots.length} Free`;
    }
    if (bikeStatsEl) {
        bikeStatsEl.innerText = `${availableBikes.length}/${bikeSlots.length} Free`;
    }

    // Render Car Bays
    renderBayGroup(carGrid, carSlots, bestCarSlot ? bestCarSlot.slot_id : null);

    // Render Bike Bays
    renderBayGroup(bikeGrid, bikeSlots, bestBikeSlot ? bestBikeSlot.slot_id : null);

    // Synchronize filters and search
    syncMapFilters();

    // If a bay is currently selected in the inspector, refresh its telemetry live
    if (currentlyInspectedSlotId) {
        refreshInspectorContent();
    }
}

/**
 * Render individual bay buttons inside a zone grid
 */
function renderBayGroup(container, slots, bestSlotId) {
    container.innerHTML = "";
    slots.forEach(slot => {
        const isOccupied = Boolean(slot.is_occupied);
        const isBestFit = !isOccupied && slot.slot_id === bestSlotId;
        const isSelected = slot.slot_id === currentlyInspectedSlotId;

        const bayEl = document.createElement("div");
        bayEl.className = `parking-bay-slot ${isOccupied ? "bay-occupied" : "bay-available"} ${isBestFit ? "bay-best-fit" : ""}`;
        if (isSelected) {
            bayEl.style.outline = "2px solid var(--primary)";
            bayEl.style.outlineOffset = "2px";
        }

        bayEl.setAttribute("data-slot-id", slot.slot_id);
        bayEl.setAttribute("data-type", slot.type);
        bayEl.setAttribute("data-occupied", isOccupied ? "true" : "false");
        bayEl.setAttribute("data-vehicle", slot.vehicle_no || "");
        bayEl.setAttribute("tabindex", "0");
        bayEl.setAttribute("role", "button");
        bayEl.setAttribute("aria-label", `Bay ${slot.slot_id}, ${slot.type}, ${isOccupied ? 'Occupied by ' + slot.vehicle_no : 'Available'}`);

        // Nearest Min-Heap indicator badge
        const bestTagHtml = isBestFit ? `<span class="best-fit-tag">⭐ Nearest</span>` : "";

        // Vehicle icon
        const icon = isOccupied
            ? (slot.type === "Car" ? "🚗" : "🏍️")
            : "🅿️";

        // Plate or prompt text
        const plateHtml = isOccupied
            ? `<span class="bay-plate-chip"><span style="color:#2563eb;font-weight:900;font-size:9px;">IND</span> ${slot.vehicle_no}</span>`
            : `<span style="font-size:11px; font-weight:600; color:var(--text-muted);">Click to Park</span>`;

        // Status pill
        const statusClass = isOccupied ? "occ" : "avail";
        const statusText = isOccupied ? "Occupied" : "Available";

        bayEl.innerHTML = `
            ${bestTagHtml}
            <div class="bay-top-row">
                <span class="bay-id-text">${slot.slot_id}</span>
                <span class="bay-distance-text">📍 ${slot.distance}m</span>
            </div>
            <div class="bay-center-icon-wrap">
                <span class="bay-main-icon">${icon}</span>
                ${plateHtml}
            </div>
            <div class="bay-bottom-status">
                <span class="bay-status-badge ${statusClass}">${statusText}</span>
            </div>
        `;

        bayEl.addEventListener("click", () => selectMapSlot(slot.slot_id));
        bayEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectMapSlot(slot.slot_id);
            }
        });

        container.appendChild(bayEl);
    });
}

/**
 * Handle selection of a parking bay to display live inspector drawer
 */
function selectMapSlot(slotId) {
    currentlyInspectedSlotId = slotId;

    // Visual outline on the selected bay
    document.querySelectorAll(".parking-bay-slot").forEach(b => {
        if (b.getAttribute("data-slot-id") === slotId) {
            b.style.outline = "2px solid var(--primary)";
            b.style.outlineOffset = "2px";
        } else {
            b.style.outline = "none";
            b.style.outlineOffset = "0";
        }
    });

    refreshInspectorContent();

    // Scroll smoothly to inspector if off-screen on mobile
    if (window.innerWidth < 768) {
        const inspector = document.getElementById("bayInspectorPanel");
        if (inspector) {
            inspector.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }
}

/**
 * Update the Bay Inspector drawer with live telemetry
 */
function refreshInspectorContent() {
    const promptEl = document.getElementById("inspectorPrompt");
    const contentEl = document.getElementById("inspectorContent");
    if (!promptEl || !contentEl) return;

    if (!currentlyInspectedSlotId) {
        promptEl.style.display = "flex";
        contentEl.style.display = "none";
        return;
    }

    const slot = cachedSlots.find(s => s.slot_id === currentlyInspectedSlotId);
    if (!slot) {
        promptEl.style.display = "flex";
        contentEl.style.display = "none";
        return;
    }

    promptEl.style.display = "none";
    contentEl.style.display = "block";

    const isOccupied = Boolean(slot.is_occupied);
    const icon = isOccupied ? (slot.type === "Car" ? "🚗" : "🏍️") : "🅿️";
    const ratePerHour = slot.type === "Car" ? 30 : 15;
    const categoryName = slot.type === "Car" ? "4-Wheeler Car Bay" : "2-Wheeler Motorcycle Bay";

    contentEl.innerHTML = `
        <div class="inspector-active-box">
            <div class="inspector-slot-badge-group">
                <div class="inspector-big-icon">${icon}</div>
                <div class="inspector-slot-info">
                    <h4>Bay ${slot.slot_id} • ${categoryName} <span class="bay-status-badge ${isOccupied ? 'occ' : 'avail'}">${isOccupied ? 'Occupied' : 'Available'}</span></h4>
                    <p>📍 Physical distance from Main Entry Gate: <b>${slot.distance} meters</b></p>
                </div>
            </div>

            <div class="inspector-telemetry-grid">
                <div class="telemetry-item">
                    <span class="telemetry-label">Vehicle Registration</span>
                    <span class="telemetry-val">${isOccupied ? slot.vehicle_no : '— (No Vehicle)'}</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Entry Timestamp</span>
                    <span class="telemetry-val">${isOccupied && slot.entry_time_str ? slot.entry_time_str : '—'}</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Live Parked Duration</span>
                    <span class="telemetry-val" id="inspectorDurationVal">${isOccupied ? 'Calculating...' : '0 min'}</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Current Billing Rate / Accrued Fee</span>
                    <span class="telemetry-val color-green" id="inspectorFeeVal">₹${ratePerHour}/hr</span>
                </div>
            </div>

            <div class="inspector-actions">
                ${isOccupied ? `
                    <button class="btn-inspector-action btn-vacate" onclick="executeCheckout('${slot.vehicle_no}')" title="Vacate & Bill Vehicle">
                        🧾 Vacate & Generate Bill
                    </button>
                    <button class="btn-subtle" onclick="copyVehicleToCheckout('${slot.vehicle_no}')" title="Copy Plate">
                        📋 Copy Plate
                    </button>
                ` : `
                    <button class="btn-inspector-action btn-park" onclick="openQuickPark('${slot.slot_id}', '${slot.type}')" title="Park Here">
                        ⚡ Park Vehicle In Bay ${slot.slot_id}
                    </button>
                    <button class="btn-subtle" onclick="prefillCheckInForm('${slot.type}')">
                        Fill Check-In Form
                    </button>
                `}
            </div>
        </div>
    `;

    updateInspectorTimer();
}

/**
 * Live duration and fee ticking for the inspected bay
 */
function updateInspectorTimer() {
    if (!currentlyInspectedSlotId) return;
    const slot = cachedSlots.find(s => s.slot_id === currentlyInspectedSlotId);
    if (!slot || !slot.is_occupied || !slot.entry_time) return;

    const durEl = document.getElementById("inspectorDurationVal");
    const feeEl = document.getElementById("inspectorFeeVal");
    if (!durEl || !feeEl) return;

    const nowSec = Date.now() / 1000;
    const diffSec = Math.max(1, Math.floor(nowSec - slot.entry_time));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    const baseRate = slot.type === "Car" ? 30.0 : 15.0;
    const perMin = slot.type === "Car" ? 0.50 : 0.25;

    let estBill = baseRate;
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins > 60) {
        estBill = baseRate + ((diffMins - 60) * perMin);
    }

    const timeStr = hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
    durEl.innerText = `⏱️ ${timeStr}`;
    feeEl.innerText = `₹${estBill.toFixed(2)} (Live Bill)`;
}

/**
 * Helper to copy vehicle number into the checkout form
 */
function copyVehicleToCheckout(plate) {
    const input = document.getElementById("exitNumber");
    if (input) {
        input.value = plate;
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus();
        showToast(`Copied plate ${plate} to checkout input`, "info");
    }
}

/**
 * Helper to prefill the check-in form with vehicle type
 */
function prefillCheckInForm(type) {
    const select = document.getElementById("vehicleTypeSelect");
    const input = document.getElementById("entryNumber");
    if (select) select.value = type;
    if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus();
    }
    showToast(`Selected ${type} category in check-in form`, "info");
}

/**
 * Filter synchronization between dashboard controls and interactive map
 */
function syncMapFilters() {
    const searchQuery = (document.getElementById("slotSearchInput")?.value || "").trim().toUpperCase();

    document.querySelectorAll(".parking-bay-slot").forEach(bay => {
        const slotId = bay.getAttribute("data-slot-id") || "";
        const slotType = bay.getAttribute("data-type") || "";
        const isOccupied = bay.getAttribute("data-occupied") === "true";
        const vehicleNo = (bay.getAttribute("data-vehicle") || "").toUpperCase();

        let visible = true;

        // Chip Filter match
        if (currentFilter === "available" && isOccupied) visible = false;
        if (currentFilter === "occupied" && !isOccupied) visible = false;
        if (currentFilter === "car" && slotType !== "Car") visible = false;
        if (currentFilter === "bike" && slotType !== "Bike") visible = false;

        // Search Query match
        if (searchQuery) {
            const matchesSlot = slotId.toUpperCase().includes(searchQuery);
            const matchesPlate = vehicleNo.includes(searchQuery);
            if (!matchesSlot && !matchesPlate) {
                visible = false;
            }
        }

        if (visible) {
            bay.classList.remove("bay-dimmed");
        } else {
            bay.classList.add("bay-dimmed");
        }
    });
}