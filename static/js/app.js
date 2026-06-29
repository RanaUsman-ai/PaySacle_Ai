/* ==========================================================================
   PayScale AI - Client Application Logic
   ========================================================================== */

// --- Global Application State ---
const state = {
    genders: [],
    educationLevels: [],
    jobTitles: [],
    stats: null,
    activeTab: 'dashboard',
    
    // Explorer Table State
    explorer: {
        currentPage: 1,
        pageSize: 10,
        searchQuery: '',
        totalPages: 1
    },
    
    // Chart References (for destruction on redraw/theme change)
    charts: {
        dashImportance: null,
        largeImportance: null,
        education: null
    }
};

// --- Page Titles Configuration ---
const PAGE_TITLES = {
    dashboard: {
        title: "Dashboard Overview",
        subtitle: "Real-time salary analytics and model predictions."
    },
    predictor: {
        title: "Salary Estimator",
        subtitle: "Estimate annual salary using the Decision Tree Regressor."
    },
    insights: {
        title: "Model Insights",
        subtitle: "Understand how the decision tree model reaches its outcomes."
    },
    explorer: {
        title: "Data Explorer",
        subtitle: "Search, filter, and inspect the underlying employee dataset."
    }
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Theme
    initTheme();
    
    // 2. Fetch Initial Metadata & Stats
    fetchMetadata();
    fetchStats();
    
    // 3. Setup Navigation Event Listeners
    setupNavigation();
    
    // 4. Setup Input Change Helpers
    setupFormHelpers();
    
    // 5. Setup Autocomplete
    setupAutocomplete();
    
    // 6. Setup Form Submission
    setupPredictForm();
    
    // 7. Setup Table Explorer Events
    setupTableExplorer();
    
    // 8. Set Current Date
    setCurrentDate();
    
    // Initial Lucide Icons Render
    lucide.createIcons();
});

// --- Theme Management ---
function initTheme() {
    const themeToggle = document.getElementById("themeToggle");
    const htmlEl = document.documentElement;
    
    // Check localStorage or fallback to dark
    const savedTheme = localStorage.getItem("payscale-theme") || "dark";
    htmlEl.setAttribute("data-theme", savedTheme);
    
    themeToggle.addEventListener("click", () => {
        const currentTheme = htmlEl.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        htmlEl.setAttribute("data-theme", newTheme);
        localStorage.setItem("payscale-theme", newTheme);
        
        // Re-draw charts to update text and gridline colors
        setTimeout(() => {
            renderCharts();
        }, 100);
    });
}

function getThemeColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
        text: isDark ? "#94a3b8" : "#475569",
        grid: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.05)",
        primary: "#3b82f6",
        accent: "#8b5cf6"
    };
}

// --- Date Helper ---
function setCurrentDate() {
    const dateEl = document.getElementById("currentDate");
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

// --- Navigation SPA ---
function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const target = link.getAttribute("data-target");
            switchToTab(target);
        });
    });
}

function switchToTab(tabId) {
    if (state.activeTab === tabId) return;
    
    // Update active nav link
    document.querySelectorAll(".nav-link").forEach(link => {
        if (link.getAttribute("data-target") === tabId) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
    
    // Update active panel with fade animation
    const oldPanel = document.getElementById(`${state.activeTab}Panel`);
    const newPanel = document.getElementById(`${tabId}Panel`);
    
    if (oldPanel) oldPanel.classList.remove("active");
    if (newPanel) newPanel.classList.add("active");
    
    // Update header labels
    const titleEl = document.getElementById("pageTitle");
    const subTitleEl = document.getElementById("pageSubTitle");
    titleEl.textContent = PAGE_TITLES[tabId].title;
    subTitleEl.textContent = PAGE_TITLES[tabId].subtitle;
    
    state.activeTab = tabId;
    
    // Tab-specific trigger actions
    if (tabId === 'explorer') {
        fetchTableData();
    }
}

// For trigger buttons inside other panels
window.switchToTab = switchToTab;

// --- Fetch Metadata (Categories and Ranges) ---
async function fetchMetadata() {
    try {
        const response = await fetch("/api/metadata");
        const data = await response.json();
        
        state.genders = data.genders;
        state.educationLevels = data.education_levels;
        state.jobTitles = data.job_titles;
        
        // Populate Education Select dropdown
        const eduSelect = document.getElementById("educationSelect");
        eduSelect.innerHTML = data.education_levels.map(level => 
            `<option value="${level}">${level}</option>`
        ).join("");
        
        // Populate Experience Limits
        const expRange = document.getElementById("experienceRange");
        expRange.min = data.experience_range.min;
        expRange.max = data.experience_range.max;
        expRange.value = data.experience_range.default;
        document.getElementById("experienceValue").textContent = data.experience_range.default;
        
        // Populate Age Limits
        const ageInput = document.getElementById("ageInput");
        ageInput.min = data.age_range.min;
        ageInput.max = data.age_range.max;
        ageInput.value = data.age_range.default;
        
    } catch (error) {
        console.error("Error fetching metadata:", error);
    }
}

// --- Fetch Dashboard & Model Stats ---
async function fetchStats() {
    try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        state.stats = data;
        
        // Update dashboard metrics
        document.getElementById("statTotalRecords").textContent = data.total_records.toLocaleString();
        document.getElementById("statAvgSalary").textContent = `$${Math.round(data.avg_salary).toLocaleString()}`;
        document.getElementById("statMaxSalary").textContent = `$${Math.round(data.max_salary).toLocaleString()}`;
        
        // Render charts
        renderCharts();
        
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

// --- Form Element Interactions ---
function setupFormHelpers() {
    // Range slider updates labels in real time
    const expRange = document.getElementById("experienceRange");
    const expVal = document.getElementById("experienceValue");
    expRange.addEventListener("input", (e) => {
        expVal.textContent = e.target.value;
    });
}

// --- Searchable Autocomplete Dropdown for Job Titles ---
function setupAutocomplete() {
    const input = document.getElementById("jobTitleInput");
    const list = document.getElementById("autocompleteList");
    const clearBtn = document.getElementById("clearJobBtn");
    
    let currentFocus = -1;
    
    // Typing input listener
    input.addEventListener("input", function() {
        const val = this.value;
        closeAllLists();
        
        if (!val) {
            clearBtn.style.display = 'none';
            return;
        }
        
        clearBtn.style.display = 'flex';
        currentFocus = -1;
        
        // Find matching job titles
        const matches = state.jobTitles.filter(title => 
            title.toLowerCase().includes(val.toLowerCase())
        ).slice(0, 8); // Limit to top 8 suggestions
        
        if (matches.length === 0) return;
        
        matches.forEach(match => {
            const item = document.createElement("div");
            
            // Highlight matching text letters
            const startIdx = match.toLowerCase().indexOf(val.toLowerCase());
            const matchedText = match.substr(startIdx, val.length);
            item.innerHTML = match.replace(new RegExp(matchedText, 'i'), `<strong>${matchedText}</strong>`);
            
            // Selection event click
            item.addEventListener("click", () => {
                input.value = match;
                closeAllLists();
            });
            
            list.appendChild(item);
        });
    });
    
    // Keyboard navigation (Arrow keys + Enter)
    input.addEventListener("keydown", function(e) {
        let items = list.getElementsByTagName("div");
        if (e.keyCode === 40) { // Arrow Down
            currentFocus++;
            addActive(items);
        } else if (e.keyCode === 38) { // Arrow Up
            currentFocus--;
            addActive(items);
        } else if (e.keyCode === 13) { // Enter
            e.preventDefault();
            if (currentFocus > -1 && items) {
                items[currentFocus].click();
            }
        }
    });
    
    // Add visual selection state class
    function addActive(items) {
        if (!items || items.length === 0) return;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        items[currentFocus].classList.add("autocomplete-active");
        items[currentFocus].scrollIntoView({ block: 'nearest' });
    }
    
    function removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove("autocomplete-active");
        }
    }
    
    function closeAllLists(elmnt) {
        const x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != input) {
                x[i].innerHTML = "";
            }
        }
    }
    
    // Clicking outside dropdown closes it
    document.addEventListener("click", (e) => {
        closeAllLists(e.target);
    });
    
    // Clear button functionality
    clearBtn.addEventListener("click", () => {
        input.value = "";
        clearBtn.style.display = 'none';
        closeAllLists();
        input.focus();
    });
}

// --- Prediction Submission ---
function setupPredictForm() {
    const form = document.getElementById("predictionForm");
    const predictBtn = document.getElementById("predictBtn");
    const resultCard = document.getElementById("resultCard");
    const placeholder = document.getElementById("resultPlaceholder");
    const display = document.getElementById("resultDisplay");
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const age = document.getElementById("ageInput").value;
        const gender = form.querySelector('input[name="gender"]:checked').value;
        const education = document.getElementById("educationSelect").value;
        const jobTitle = document.getElementById("jobTitleInput").value;
        const experience = document.getElementById("experienceRange").value;
        
        // Validate Job Title exists in classes list
        if (!state.jobTitles.includes(jobTitle)) {
            alert(`Please select a valid Job Title from the autocomplete suggestions. '${jobTitle}' is not in the dataset.`);
            return;
        }
        
        // Start loading animation on button
        predictBtn.classList.add("loading");
        predictBtn.disabled = true;
        
        try {
            const response = await fetch("/api/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    age: age,
                    gender: gender,
                    education: education,
                    job_title: jobTitle,
                    experience: experience
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Deactivate placeholder, activate result view
                placeholder.style.display = "none";
                display.style.display = "flex";
                resultCard.classList.remove("inactive");
                resultCard.classList.add("active-prediction");
                
                // Animate count-up for predicted salary
                animateSalaryCount(result.predicted_salary);
                
                // Update salary tier
                const tierEl = document.getElementById("salaryTier");
                tierEl.textContent = result.tier;
                tierEl.style.backgroundColor = `${result.tier_color}1b`; // Semi-transparent
                tierEl.style.color = result.tier_color;
                
                // Update role average and difference
                const roleAvgEl = document.getElementById("roleAvgSalary");
                roleAvgEl.textContent = result.average_for_role ? 
                    `$${Math.round(result.average_for_role).toLocaleString()}` : "N/A";
                
                const compareEl = document.getElementById("globalCompareText");
                const trendIcon = document.getElementById("trendIcon");
                const diff = result.pct_difference_global;
                
                compareEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
                
                if (diff >= 0) {
                    compareEl.style.color = "var(--accent-emerald)";
                    trendIcon.setAttribute("data-lucide", "arrow-up-right");
                    trendIcon.className = "trend-icon-up";
                } else {
                    compareEl.style.color = "var(--accent-red)";
                    trendIcon.setAttribute("data-lucide", "arrow-down-right");
                    trendIcon.className = "trend-icon-down";
                }
                
                // Animate gauge placement meter (Max range assumes 250k)
                const percentage = Math.min(100, Math.max(0, (result.predicted_salary / 250000) * 100));
                document.getElementById("gaugePercentage").textContent = `${Math.round(percentage)}%`;
                document.getElementById("gaugeBar").style.width = `${percentage}%`;
                
                // Rerender Lucide Icons
                lucide.createIcons();
                
            } else {
                alert(`Error: ${result.error}`);
            }
            
        } catch (error) {
            console.error("Prediction API failed:", error);
            alert("Prediction failed. Please ensure the backend server is running.");
        } finally {
            predictBtn.classList.remove("loading");
            predictBtn.disabled = false;
        }
    });
}

// Numeric count-up animation for salary display
function animateSalaryCount(targetValue) {
    const salaryEl = document.getElementById("predictedSalary");
    const duration = 1200; // 1.2 seconds
    const startTime = performance.now();
    
    function updateCount(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Easing out function
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.floor(easeProgress * targetValue);
        salaryEl.textContent = currentValue.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCount);
        } else {
            salaryEl.textContent = Math.round(targetValue).toLocaleString();
        }
    }
    
    requestAnimationFrame(updateCount);
}

// --- Chart.js Rendering ---
function renderCharts() {
    if (!state.stats) return;
    
    const colors = getThemeColors();
    
    // Common Chart options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                grid: { color: colors.grid },
                ticks: { color: colors.text, font: { family: 'Inter' } }
            },
            y: {
                grid: { color: colors.grid },
                ticks: { color: colors.text, font: { family: 'Inter' } }
            }
        }
    };
    
    // 1. Dashboard Horizontal Bar (Preview of importances)
    if (state.charts.dashImportance) state.charts.dashImportance.destroy();
    
    const dashCtx = document.getElementById("dashboardImportanceChart").getContext("2d");
    const importanceLabels = state.stats.feature_importance.map(item => item.feature);
    const importanceValues = state.stats.feature_importance.map(item => item.importance);
    
    state.charts.dashImportance = new Chart(dashCtx, {
        type: 'bar',
        data: {
            labels: importanceLabels,
            datasets: [{
                data: importanceValues,
                backgroundColor: 'rgba(59, 130, 246, 0.65)',
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            ...commonOptions,
            indexAxis: 'y',
            plugins: { legend: { display: false } }
        }
    });
    
    // 2. Large Horizontal Bar Chart (Insights page)
    if (state.charts.largeImportance) state.charts.largeImportance.destroy();
    
    const largeCtx = document.getElementById("featureImportanceChartLarge").getContext("2d");
    state.charts.largeImportance = new Chart(largeCtx, {
        type: 'bar',
        data: {
            labels: importanceLabels,
            datasets: [{
                label: 'Importance Percentage',
                data: importanceValues,
                backgroundColor: 'rgba(139, 92, 246, 0.65)',
                borderColor: '#8b5cf6',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            ...commonOptions,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `Importance: ${ctx.parsed.x}%` } }
            }
        }
    });
    
    // 3. Education vs Average Salary Chart
    if (state.charts.education) state.charts.education.destroy();
    
    const eduCtx = document.getElementById("educationChart").getContext("2d");
    const eduLabels = state.stats.education_breakdown.map(item => item.education);
    const eduAverages = state.stats.education_breakdown.map(item => item.avg_salary);
    
    state.charts.education = new Chart(eduCtx, {
        type: 'bar',
        data: {
            labels: eduLabels,
            datasets: [{
                data: eduAverages,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.65)',
                    'rgba(16, 185, 129, 0.65)',
                    'rgba(139, 92, 246, 0.65)'
                ],
                borderColor: [
                    '#3b82f6',
                    '#10b981',
                    '#8b5cf6'
                ],
                borderWidth: 1.5,
                borderRadius: 8
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `Avg Salary: $${Math.round(ctx.parsed.y).toLocaleString()}` } }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        color: colors.text,
                        font: { family: 'Inter' },
                        callback: (val) => `$${val/1000}k`
                    }
                }
            }
        }
    });
}

// --- Data Explorer Table Logic ---
function setupTableExplorer() {
    const searchInput = document.getElementById("tableSearchInput");
    const recordsSelect = document.getElementById("recordsPerPageSelect");
    
    // Debounced search logic (wait 300ms after user stops typing)
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.explorer.searchQuery = e.target.value;
            state.explorer.currentPage = 1; // Reset to page 1
            fetchTableData();
        }, 300);
    });
    
    // Page Size dropdown select change listener
    recordsSelect.addEventListener("change", (e) => {
        state.explorer.pageSize = parseInt(e.target.value);
        state.explorer.currentPage = 1;
        fetchTableData();
    });
}

async function fetchTableData() {
    const tableBody = document.getElementById("tableBody");
    const paginationInfo = document.getElementById("paginationInfo");
    
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading records...</td></tr>`;
    
    try {
        const queryParams = new URLSearchParams({
            page: state.explorer.currentPage,
            per_page: state.explorer.pageSize,
            search: state.explorer.searchQuery
        });
        
        const response = await fetch(`/api/data?${queryParams.toString()}`);
        const data = await response.json();
        
        state.explorer.totalPages = data.pages;
        
        // Render rows
        if (data.rows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);"><i data-lucide="info" style="margin: 0 auto 10px; display:block;"></i>No records found matching search query.</td></tr>`;
            paginationInfo.textContent = "Showing 0 to 0 of 0 records";
            document.getElementById("paginationButtons").innerHTML = "";
            lucide.createIcons();
            return;
        }
        
        tableBody.innerHTML = data.rows.map(row => `
            <tr>
                <td>${Math.round(row.Age)}</td>
                <td><span class="badge" style="background-color: ${row.Gender === 'Male' ? '#3b82f61a' : '#ec48991a'}; color: ${row.Gender === 'Male' ? '#3b82f6' : '#ec4899'}; border-color: ${row.Gender === 'Male' ? '#3b82f633' : '#ec489933'}">${row.Gender}</span></td>
                <td>${row["Education Level"]}</td>
                <td style="font-weight:600;">${row["Job Title"]}</td>
                <td>${row["Years of Experience"]}</td>
                <td style="color: var(--accent-emerald); font-weight:700;">$${Math.round(row.Salary).toLocaleString()}</td>
            </tr>
        `).join("");
        
        // Update pagination status text
        const startRecord = (state.explorer.currentPage - 1) * state.explorer.pageSize + 1;
        const endRecord = Math.min(state.explorer.currentPage * state.explorer.pageSize, data.total);
        paginationInfo.textContent = `Showing ${startRecord} to ${endRecord} of ${data.total} records`;
        
        // Build pagination buttons
        renderPaginationControls();
        
    } catch (error) {
        console.error("Error fetching explorer data:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--accent-red);">Failed to load table records. Please verify the server connection.</td></tr>`;
    }
}

function renderPaginationControls() {
    const container = document.getElementById("paginationButtons");
    container.innerHTML = "";
    
    const cur = state.explorer.currentPage;
    const tot = state.explorer.totalPages;
    
    if (tot <= 1) return; // No pagination buttons needed if only 1 page
    
    // 1. Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = `<i data-lucide="chevron-left" style="width:14px;height:14px;"></i>`;
    prevBtn.disabled = cur === 1;
    prevBtn.addEventListener("click", () => {
        state.explorer.currentPage--;
        fetchTableData();
    });
    container.appendChild(prevBtn);
    
    // 2. Page Number Buttons (smart range)
    const maxVisible = 5;
    let startPage = Math.max(1, cur - Math.floor(maxVisible / 2));
    let endPage = Math.min(tot, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = `page-btn ${i === cur ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener("click", () => {
            state.explorer.currentPage = i;
            fetchTableData();
        });
        container.appendChild(pageBtn);
    }
    
    // 3. Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = `<i data-lucide="chevron-right" style="width:14px;height:14px;"></i>`;
    nextBtn.disabled = cur === tot;
    nextBtn.addEventListener("click", () => {
        state.explorer.currentPage++;
        fetchTableData();
    });
    container.appendChild(nextBtn);
    
    lucide.createIcons();
}

// --- Fullscreen Decision Tree Image View Modal ---
function openFullscreenTree() {
    const modal = document.getElementById("treeModal");
    modal.classList.add("open");
}

function closeFullscreenTree() {
    const modal = document.getElementById("treeModal");
    modal.classList.remove("open");
}

window.openFullscreenTree = openFullscreenTree;
window.closeFullscreenTree = closeFullscreenTree;
