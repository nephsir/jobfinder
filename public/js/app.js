// JobFinder Platform - Streamlined Application Experience
// Focus: Quick 3-Step Process from Application to Interview

// ===== Global State =====
let allJobs = [];
let selectedJob = null;
let userProfile = null;
let currentUserRole = 'jobseeker';  // 'jobseeker' | 'employer'
let allApplications = [];
let selectedApplicationId = null;
let authToken = null;
let currentUser = null;

// ===== Socket.IO Connection =====
const socket = io();

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', function() {
    initializeMaterialize();
    loadAuth();
    loadUserProfile();
    loadJobTitlesForProfile(); // populates quick-search dropdown (same as profile job title)
    loadJobs();
    setupSocketListeners();
    setupEventListeners();
    setupRoleSwitcher();
    
    // DEBUG: Watch for any changes to jobs-container
    const container = document.getElementById('jobs-container');
    if (container) {
        const observer = new MutationObserver((mutations) => {
            console.log('[MutationObserver] jobs-container changed!', mutations.length, 'mutations');
            console.log('[MutationObserver] New content preview:', container.innerHTML.substring(0, 200));
            console.log('[MutationObserver] Stack:', new Error().stack);
        });
        observer.observe(container, { childList: true, subtree: true, characterData: true });
    }
    
    // DEBUG: Watch for class changes on jobseeker-view (to detect if it gets hidden)
    const jobseekerView = document.getElementById('jobseeker-view');
    if (jobseekerView) {
        const viewObserver = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.attributeName === 'class') {
                    console.log('[ViewObserver] jobseeker-view class changed to:', jobseekerView.className);
                    console.log('[ViewObserver] Is hidden?', jobseekerView.classList.contains('view-hidden'));
                }
            });
        });
        viewObserver.observe(jobseekerView, { attributes: true });
    }
    
    // DEBUG: Log every 2 seconds if jobs are visible
    setInterval(() => {
        const c = document.getElementById('jobs-container');
        const v = document.getElementById('jobseeker-view');
        console.log('[HealthCheck] allJobs:', allJobs?.length, 
                    'container children:', c?.children?.length,
                    'container visible:', c?.offsetParent !== null,
                    'view hidden:', v?.classList?.contains('view-hidden'));
    }, 2000);
});

// ===== Initialize Materialize Components =====
function initializeMaterialize() {
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.Modal.init(document.querySelectorAll('.modal'), {
        dismissible: true,
        opacity: 0.5,
        inDuration: 250,
        outDuration: 200
    });
    M.FormSelect.init(document.querySelectorAll('select'));
}

// ===== Socket.IO Event Listeners =====
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connected to JobFinder');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected');
        updateConnectionStatus(false);
    });
    
    socket.on('newJob', (data) => {
        if (data && data.job && data.job.title) {
            showToast(`New Job: ${data.job.title}`, 'info');
            allJobs = [data.job, ...allJobs];
            renderJobs(allJobs);
            const totalEl = document.getElementById('total-jobs');
            if (totalEl) totalEl.textContent = allJobs.length;
        }
    });
    
    socket.on('applicationConfirmed', (data) => {
        if (data.success) {
            // Close quick apply modal
            M.Modal.getInstance(document.getElementById('quick-apply-modal')).close();
            // Open success modal
            M.Modal.getInstance(document.getElementById('success-modal')).open();
        }
    });
    
    socket.on('interviewScheduled', (data) => {
        showToast(`Interview scheduled for ${data.date}!`, 'success');
    });
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Filter chips (stop propagation so section onclick doesn't navigate away)
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            filterJobs(this.dataset.filter);
        });
    });
    
    // Quick search: Enter on select goes to jobs
    const quickSearchEl = document.getElementById('quick-search');
    if (quickSearchEl) {
        quickSearchEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); goToJobs(); }
        });
    }
}

// ===== Role Switcher (Job Seeker / Employer) =====
function setupRoleSwitcher() {
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const role = this.dataset.role;
            
            // Job Seeker: go directly to jobs page
            if (role === 'jobseeker') {
                window.location.href = '/jobs';
                return;
            }
            
            // Employer: check if logged in as employer
            if (role === 'employer') {
                if (!currentUser || !authToken) {
                    // Not logged in - show login modal with employer tab
                    openAccountModalForEmployer();
                    return;
                }
                if (currentUser.role !== 'employer') {
                    // Logged in but not as employer - prompt to login as employer
                    showToast('Please log in with an employer account', 'orange');
                    openAccountModalForEmployer();
                    return;
                }
            }
            
            switchView(role);
        });
    });
}

// Open account modal with employer login tab selected
function openAccountModalForEmployer() {
    const modal = document.getElementById('account-modal');
    if (!modal) return;
    showAccountPanel('login', 'employer');
    const inst = M.Modal.getInstance(modal);
    if (inst) inst.open();
}

function switchView(role) {
    currentUserRole = role;
    
    // Update role tabs
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.role === role);
    });
    
    // Show/hide views
    document.getElementById('jobseeker-view').classList.toggle('view-hidden', role !== 'jobseeker');
    document.getElementById('employer-view').classList.toggle('view-hidden', role !== 'employer');
    
    // Show/hide nav items
    document.querySelectorAll('.nav-jobseeker').forEach(el => {
        el.style.display = role === 'jobseeker' ? '' : 'none';
    });
    document.querySelectorAll('.nav-employer').forEach(el => {
        el.style.display = role === 'employer' ? '' : 'none';
    });
    
    if (role === 'employer') {
        loadEmployerJobs();
        loadEmployerStats();
    }
}

// Update employer-specific elements based on user role
function updateEmployerTabVisibility() {
    const isEmployer = currentUser && currentUser.role === 'employer';
    
    // Employer tabs are always visible - clicking them shows login if not logged in as employer
    // But employer nav items (like "Post a Job") should only show for logged-in employers
    document.querySelectorAll('.nav-employer').forEach(el => {
        el.style.display = isEmployer ? '' : 'none';
    });
    
    // If currently on employer view but not an employer, switch to jobseeker
    if (currentUserRole === 'employer' && !isEmployer) {
        const jobseekerView = document.getElementById('jobseeker-view');
        const employerView = document.getElementById('employer-view');
        if (jobseekerView) jobseekerView.classList.remove('view-hidden');
        if (employerView) employerView.classList.add('view-hidden');
        currentUserRole = 'jobseeker';
    }
}

// ===== Auth Helpers =====
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    return headers;
}

async function loadAuth() {
    authToken = localStorage.getItem('jobfinder_token');
    if (!authToken) {
        updateHeaderAuth();
        return;
    }
    try {
        const response = await fetch('/api/auth/me', { headers: getAuthHeaders() });
        const result = await response.json();
        if (result.statusCode === 200 && result.data) {
            currentUser = result.data;
            localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
            if (currentUser.skills && Array.isArray(currentUser.skills)) {
                userProfile = {
                    name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                    email: currentUser.email,
                    phone: currentUser.phone || '',
                    location: currentUser.location || '',
                    title: currentUser.title || '',
                    skills: Array.isArray(currentUser.skills) ? currentUser.skills.join(', ') : (currentUser.skills || '')
                };
                localStorage.setItem('jobfinder_profile', JSON.stringify(userProfile));
            }
        } else {
            authToken = null;
            localStorage.removeItem('jobfinder_token');
        }
    } catch (e) {
        authToken = null;
        localStorage.removeItem('jobfinder_token');
    }
    updateHeaderAuth();
    
    // Auto-switch to employer view if logged in as employer
    if (currentUser && currentUser.role === 'employer') {
        switchView('employer');
    }
}

function updateHeaderAuth() {
    const guest = document.getElementById('nav-auth-guest');
    const user = document.getElementById('nav-auth-user');
    const logoutEl = document.getElementById('nav-auth-logout');
    const sGuest = document.getElementById('sidenav-auth-guest');
    const sUser = document.getElementById('sidenav-auth-user');
    const sUser2 = document.getElementById('sidenav-auth-user-2');
    if (currentUser && authToken) {
        if (guest) guest.style.display = 'none';
        if (user) user.style.display = '';
        if (logoutEl) logoutEl.style.display = '';
        if (sGuest) sGuest.style.display = 'none';
        if (sUser) sUser.style.display = '';
        if (sUser2) sUser2.style.display = '';
    } else {
        if (guest) guest.style.display = '';
        if (user) user.style.display = 'none';
        if (logoutEl) logoutEl.style.display = 'none';
        if (sGuest) sGuest.style.display = '';
        if (sUser) sUser.style.display = 'none';
        if (sUser2) sUser2.style.display = 'none';
    }
    // Update employer tab visibility based on user role
    updateEmployerTabVisibility();
}

let profileJobTitlesCache = null;

// Fallback list if API fails (same titles as backend, all count 0)
const FALLBACK_JOB_TITLES = [
    'Software Engineer', 'Senior Software Engineer', 'Junior Software Engineer', 'Full Stack Developer',
    'Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'Data Engineer', 'Machine Learning Engineer',
    'UX Designer', 'UI Designer', 'UX/UI Designer', 'Product Designer', 'Graphic Designer', 'Web Designer',
    'Data Analyst', 'Data Scientist', 'Business Analyst', 'Financial Analyst', 'Marketing Analyst',
    'Project Manager', 'Product Manager', 'Program Manager', 'Scrum Master', 'Technical Lead',
    'Solutions Architect', 'Software Architect', 'System Administrator', 'IT Support', 'Network Engineer',
    'Quality Assurance Engineer', 'QA Engineer', 'Test Engineer', 'Security Engineer', 'Cloud Engineer',
    'Mobile Developer', 'iOS Developer', 'Android Developer', 'Game Developer', 'Embedded Software Engineer',
    'Content Writer', 'Technical Writer', 'Digital Marketing Specialist', 'SEO Specialist', 'Social Media Manager',
    'Human Resources Manager', 'Recruiter', 'Accountant', 'Financial Controller', 'Legal Counsel',
    'Nurse', 'Healthcare Administrator', 'Teacher', 'Lecturer', 'Research Scientist', 'Laboratory Technician',
    'Sales Representative', 'Account Manager', 'Customer Success Manager', 'Operations Manager',
    'Administrative Assistant', 'Executive Assistant', 'Office Manager', 'Receptionist'
].map(t => ({ title: t, count: 0 }));

async function loadJobTitlesForProfile() {
    if (profileJobTitlesCache && profileJobTitlesCache.length > 0) {
        populateProfileTitleSelects();
        return profileJobTitlesCache;
    }
    try {
        const response = await fetch('/api/jobs/titles');
        const result = await response.json();
        if (result.statusCode === 200 && Array.isArray(result.data)) {
            profileJobTitlesCache = result.data.length > 0 ? result.data : FALLBACK_JOB_TITLES;
            populateProfileTitleSelects();
            return profileJobTitlesCache;
        }
    } catch (e) { console.error('Failed to load job titles', e); }
    profileJobTitlesCache = FALLBACK_JOB_TITLES;
    populateProfileTitleSelects();
    return profileJobTitlesCache;
}

function populateProfileTitleSelects() {
    const titles = profileJobTitlesCache || [];
    const optionHtml = (title, count) => {
        const label = count === 0 ? `${title} (0)` : `${title} (${count})`;
        const cls = count === 0 ? ' class="job-title-unavailable"' : '';
        return `<option value="${(title || '').replace(/"/g, '&quot;')}"${cls}>${label.replace(/</g, '&lt;')}</option>`;
    };
    const opts = '<option value="" disabled selected>Choose job title</option>' +
        titles.map(t => optionHtml(t.title, t.count)).join('') +
        '<option value="__other__">Other (type below)</option>';
    const selCreate = document.getElementById('account-create-title');
    const selEdit = document.getElementById('profile-edit-title');
    if (selCreate) {
        selCreate.innerHTML = opts;
        reinitFormSelect(selCreate);
    }
    if (selEdit) {
        selEdit.innerHTML = opts;
        reinitFormSelect(selEdit);
    }
    populateQuickSearchSelect();
}

function populateQuickSearchSelect() {
    const titles = profileJobTitlesCache || [];
    const sel = document.getElementById('quick-search');
    if (!sel) return;
    const optionHtml = (title, count) => {
        const label = count === 0 ? `${title} (0)` : `${title} (${count})`;
        const cls = count === 0 ? ' class="job-title-unavailable"' : '';
        return `<option value="${(title || '').replace(/"/g, '&quot;')}"${cls}>${label.replace(/</g, '&lt;')}</option>`;
    };
    const opts = '<option value="" disabled selected>Job title, skill, or company...</option>' +
        titles.map(t => optionHtml(t.title, t.count)).join('');
    sel.innerHTML = opts;
    reinitFormSelect(sel);
    setupQuickSearchSelectChange();
}

function setupQuickSearchSelectChange() {
    const sel = document.getElementById('quick-search');
    if (!sel) return;
    // Remove old listener flag and re-add (in case select was rebuilt)
    delete sel.dataset.quickSearchChangeSetup;
    sel.dataset.quickSearchChangeSetup = '1';
    
    // Use onchange directly for better compatibility with Materialize
    sel.onchange = function() {
        const keyword = this.value;
        if (!keyword) return;
        console.log('[QuickSearch] Selected:', keyword);
        // Fetch jobs matching this title, get first job's id, redirect with ONLY apply= (no search=)
        fetch('/api/jobs/search?keyword=' + encodeURIComponent(keyword))
            .then(function(res) { return res.json(); })
            .then(function(data) {
                console.log('[QuickSearch] Search result:', data);
                if (data.statusCode === 200 && Array.isArray(data.data) && data.data.length > 0) {
                    console.log('[QuickSearch] Redirecting to /jobs?apply=' + data.data[0].id);
                    window.location.href = '/jobs?apply=' + encodeURIComponent(data.data[0].id);
                } else {
                    console.log('[QuickSearch] No results, redirecting to /jobs');
                    window.location.href = '/jobs';
                }
            })
            .catch(function(e) {
                console.error('[QuickSearch] Error:', e);
                window.location.href = '/jobs';
            });
    };
}

function getQuickSearchKeyword() {
    const sel = document.getElementById('quick-search');
    return sel ? (sel.value || '').trim() : '';
}

function reinitFormSelect(selectEl) {
    if (!selectEl) return;
    try {
        const inst = M.FormSelect.getInstance(selectEl);
        if (inst && typeof inst.destroy === 'function') inst.destroy();
    } catch (e) {}
    M.FormSelect.init(selectEl);
}

function setupProfileLocationTitleOther() {
    function toggleOther(selectId, otherInputId) {
        const sel = document.getElementById(selectId);
        const other = document.getElementById(otherInputId);
        if (!sel || !other || sel.dataset.locationTitleSetup === '1') return;
        sel.dataset.locationTitleSetup = '1';
        function update() {
            other.style.display = (sel.value === '__other__') ? 'block' : 'none';
            if (sel.value !== '__other__') other.value = '';
        }
        sel.addEventListener('change', update);
        update();
    }
    toggleOther('account-create-location', 'account-create-location-other');
    toggleOther('account-create-title', 'account-create-title-other');
    toggleOther('profile-edit-location', 'profile-edit-location-other');
    toggleOther('profile-edit-title', 'profile-edit-title-other');
}

function getAccountCreateLocation() {
    const sel = document.getElementById('account-create-location');
    const other = document.getElementById('account-create-location-other');
    if (sel && sel.value === '__other__' && other) return other.value.trim();
    return sel ? (sel.value || '').trim() : '';
}

function getAccountCreateTitle() {
    const sel = document.getElementById('account-create-title');
    const other = document.getElementById('account-create-title-other');
    if (sel && sel.value === '__other__' && other) return other.value.trim();
    return sel ? (sel.value || '').trim() : '';
}

function getProfileEditLocation() {
    const sel = document.getElementById('profile-edit-location');
    const other = document.getElementById('profile-edit-location-other');
    if (sel && sel.value === '__other__' && other) return other.value.trim();
    return sel ? (sel.value || '').trim() : '';
}

function getProfileEditTitle() {
    const sel = document.getElementById('profile-edit-title');
    const other = document.getElementById('profile-edit-title-other');
    if (sel && sel.value === '__other__' && other) return other.value.trim();
    return sel ? (sel.value || '').trim() : '';
}

function showAccountPanel(panel, defaultTab) {
    document.getElementById('account-login-panel').style.display = panel === 'login' ? 'block' : 'none';
    document.getElementById('account-create-panel').style.display = panel === 'create' ? 'block' : 'none';
    document.getElementById('account-profile-panel').style.display = 'none';
    document.getElementById('account-footer-login').style.display = panel === 'login' ? '' : 'none';
    document.getElementById('account-footer-create').style.display = panel === 'create' ? '' : 'none';
    document.getElementById('account-footer-profile').style.display = 'none';
    document.getElementById('account-login-error').style.display = 'none';
    document.getElementById('account-create-error').style.display = 'none';
    const employerLoginErr = document.getElementById('employer-login-error');
    if (employerLoginErr) employerLoginErr.style.display = 'none';
    const employerErr = document.getElementById('employer-create-error');
    if (employerErr) employerErr.style.display = 'none';
    
    if (panel === 'login') {
        // Initialize login type tabs
        const loginTabsEl = document.querySelector('.login-type-tabs');
        if (loginTabsEl) {
            M.Tabs.init(loginTabsEl);
        }
        // Set default tab (jobseeker or employer)
        activeLoginTab = defaultTab || 'jobseeker';
        switchLoginTab(activeLoginTab);
        // Focus appropriate input
        if (activeLoginTab === 'employer') {
            const empEmail = document.getElementById('employer-login-email');
            if (empEmail) empEmail.focus();
        } else {
            const jsEmail = document.getElementById('account-login-email');
            if (jsEmail) jsEmail.focus();
        }
    }
    if (panel === 'create') {
        loadJobTitlesForProfile();
        setupProfileLocationTitleOther();
        reinitFormSelect(document.getElementById('account-create-location'));
        reinitFormSelect(document.getElementById('account-create-title'));
        M.updateTextFields();
        // Initialize signup type tabs
        const tabsEl = document.querySelector('.signup-type-tabs');
        if (tabsEl) {
            M.Tabs.init(tabsEl);
        }
        // Set default tab (jobseeker or employer)
        activeSignupTab = defaultTab || 'jobseeker';
        switchSignupTab(activeSignupTab);
    }
}

function openAccountModal() {
    const modal = document.getElementById('account-modal');
    if (!modal) return;
    if (currentUser && authToken) {
        document.getElementById('account-login-panel').style.display = 'none';
        document.getElementById('account-create-panel').style.display = 'none';
        document.getElementById('account-profile-panel').style.display = 'block';
        document.getElementById('account-footer-login').style.display = 'none';
        document.getElementById('account-footer-create').style.display = 'none';
        document.getElementById('account-footer-profile').style.display = '';
        profileSwitchToView();
        fillProfileView();
    } else {
        showAccountPanel('login');
    }
    const inst = M.Modal.getInstance(modal);
    if (inst) inst.open();
}

// Track which login tab is active
let activeLoginTab = 'jobseeker';

function switchLoginTab(tabType) {
    activeLoginTab = tabType;
    const jobseekerTab = document.getElementById('login-jobseeker-tab');
    const employerTab = document.getElementById('login-employer-tab');
    const submitBtn = document.getElementById('login-submit-btn');
    
    if (tabType === 'employer') {
        if (jobseekerTab) jobseekerTab.style.display = 'none';
        if (employerTab) employerTab.style.display = 'block';
        if (submitBtn) submitBtn.innerHTML = '<i class="material-icons left">business</i>Log in as Employer';
    } else {
        if (jobseekerTab) jobseekerTab.style.display = 'block';
        if (employerTab) employerTab.style.display = 'none';
        if (submitBtn) submitBtn.innerHTML = '<i class="material-icons left">login</i>Log in';
    }
}

// Unified login function
function submitLogin() {
    if (activeLoginTab === 'employer') {
        submitEmployerLogin();
    } else {
        submitLoginFromAccount();
    }
}

// Employer login
async function submitEmployerLogin() {
    const email = document.getElementById('employer-login-email').value.trim();
    const password = document.getElementById('employer-login-password').value;
    const errEl = document.getElementById('employer-login-error');
    
    if (!email || !password) {
        errEl.textContent = 'Please enter email and password';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        
        if (result.statusCode === 200 && result.data && result.data.token) {
            // Check if user is an employer
            if (result.data.user.role !== 'employer') {
                errEl.textContent = 'This account is not an employer account. Please use the Job Seeker login.';
                errEl.style.display = 'block';
                return;
            }
            
            authToken = result.data.token;
            currentUser = result.data.user;
            localStorage.setItem('jobfinder_token', authToken);
            localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
            userProfile = {
                name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                email: currentUser.email,
                phone: currentUser.phone || '',
                location: currentUser.location || '',
                companyName: currentUser.companyName || '',
                industry: currentUser.industry || ''
            };
            localStorage.setItem('jobfinder_profile', JSON.stringify(userProfile));
            M.Modal.getInstance(document.getElementById('account-modal')).close();
            updateHeaderAuth();
            showToast('Logged in! Welcome to your dashboard', 'success');
            switchView('employer');
        } else {
            errEl.textContent = result.message || 'Login failed';
            errEl.style.display = 'block';
        }
    } catch (e) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
}

// Job Seeker login
async function submitLoginFromAccount() {
    const email = document.getElementById('account-login-email').value.trim();
    const password = document.getElementById('account-login-password').value;
    const errEl = document.getElementById('account-login-error');
    if (!email || !password) {
        errEl.textContent = 'Please enter email and password';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (result.statusCode === 200 && result.data && result.data.token) {
            authToken = result.data.token;
            currentUser = result.data.user;
            localStorage.setItem('jobfinder_token', authToken);
            localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
            if (currentUser.skills && Array.isArray(currentUser.skills)) {
                userProfile = {
                    name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                    email: currentUser.email,
                    phone: currentUser.phone || '',
                    location: currentUser.location || '',
                    title: currentUser.title || '',
                    skills: currentUser.skills.join(', ')
                };
                localStorage.setItem('jobfinder_profile', JSON.stringify(userProfile));
            }
            M.Modal.getInstance(document.getElementById('account-modal')).close();
            updateHeaderAuth();
            
            // Redirect based on user role
            if (currentUser.role === 'employer') {
                showToast('Logged in! Welcome to your dashboard', 'success');
                switchView('employer');
            } else {
                showToast('Logged in! Redirecting to jobs...', 'success');
                setTimeout(() => {
                    window.location.href = '/jobs';
                }, 500);
            }
        } else {
            errEl.textContent = result.message || 'Login failed';
            errEl.style.display = 'block';
        }
    } catch (e) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
}

// Track which signup tab is active
let activeSignupTab = 'jobseeker';

function switchSignupTab(tabType) {
    activeSignupTab = tabType;
    const jobseekerTab = document.getElementById('signup-jobseeker-tab');
    const employerTab = document.getElementById('signup-employer-tab');
    const submitBtn = document.getElementById('signup-submit-btn');
    
    if (tabType === 'employer') {
        if (jobseekerTab) jobseekerTab.style.display = 'none';
        if (employerTab) employerTab.style.display = 'block';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="material-icons left">business</i>Create Employer Account';
        }
        // Initialize employer location select
        initEmployerSelects();
    } else {
        if (jobseekerTab) jobseekerTab.style.display = 'block';
        if (employerTab) employerTab.style.display = 'none';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="material-icons left">person_add</i>Create Account';
        }
    }
}

function initEmployerSelects() {
    // Initialize Materialize selects for employer form
    const locationSelect = document.getElementById('employer-create-location');
    const industrySelect = document.getElementById('employer-create-industry');
    if (locationSelect) M.FormSelect.init(locationSelect);
    if (industrySelect) M.FormSelect.init(industrySelect);
    
    // Setup location "other" handler
    if (locationSelect && !locationSelect.dataset.otherSetup) {
        locationSelect.dataset.otherSetup = '1';
        locationSelect.addEventListener('change', function() {
            const otherInput = document.getElementById('employer-create-location-other');
            if (otherInput) {
                otherInput.style.display = this.value === '__other__' ? 'block' : 'none';
            }
        });
    }
}

function getEmployerCreateLocation() {
    const sel = document.getElementById('employer-create-location');
    const other = document.getElementById('employer-create-location-other');
    if (sel && sel.value === '__other__' && other) {
        return other.value.trim();
    }
    return sel ? sel.value : '';
}

// Unified signup function - checks which tab is active
function submitSignup() {
    if (activeSignupTab === 'employer') {
        submitEmployerSignup();
    } else {
        submitCreateProfileFromAccount();
    }
}

// Employer signup
async function submitEmployerSignup() {
    const firstName = document.getElementById('employer-create-firstName').value.trim();
    const lastName = document.getElementById('employer-create-lastName').value.trim();
    const companyName = document.getElementById('employer-create-companyName').value.trim();
    const email = document.getElementById('employer-create-email').value.trim();
    const password = document.getElementById('employer-create-password').value;
    const phone = document.getElementById('employer-create-phone').value.trim();
    const location = getEmployerCreateLocation();
    const industrySelect = document.getElementById('employer-create-industry');
    const industry = industrySelect ? industrySelect.value : '';
    const description = document.getElementById('employer-create-description').value.trim();
    
    const errEl = document.getElementById('employer-create-error');
    
    if (!firstName || !lastName || !companyName || !email || !password) {
        errEl.textContent = 'Please fill required fields (name, company, email, password).';
        errEl.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                password,
                phone,
                location,
                role: 'employer',
                companyName,
                industry,
                bio: description
            })
        });
        
        let result;
        try {
            const text = await response.text();
            result = text ? JSON.parse(text) : {};
        } catch (parseErr) {
            errEl.textContent = 'Server returned invalid response (status ' + response.status + ').';
            errEl.style.display = 'block';
            return;
        }
        
        if (!result.statusCode && response.status !== 201) {
            errEl.textContent = result.message || 'Server error (status ' + response.status + ').';
            errEl.style.display = 'block';
            return;
        }
        
        if (result.statusCode === 201 && result.data && result.data.token) {
            authToken = result.data.token;
            currentUser = result.data.user;
            localStorage.setItem('jobfinder_token', authToken);
            localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
            userProfile = {
                name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                email: currentUser.email,
                phone: currentUser.phone || '',
                location: currentUser.location || '',
                companyName: currentUser.companyName || '',
                industry: currentUser.industry || ''
            };
            localStorage.setItem('jobfinder_profile', JSON.stringify(userProfile));
            M.Modal.getInstance(document.getElementById('account-modal')).close();
            updateHeaderAuth();
            showToast('Employer account created! Welcome to your dashboard', 'success');
            // Switch to employer view
            switchView('employer');
        } else {
            errEl.textContent = result.message || 'Create account failed';
            errEl.style.display = 'block';
        }
    } catch (e) {
        console.error('Employer signup error:', e);
        errEl.textContent = 'Cannot reach server. Check your connection.';
        errEl.style.display = 'block';
    }
}

async function submitCreateProfileFromAccount() {
    const firstName = document.getElementById('account-create-firstName').value.trim();
    const lastName = document.getElementById('account-create-lastName').value.trim();
    const email = document.getElementById('account-create-email').value.trim();
    const password = document.getElementById('account-create-password').value;
    const phone = document.getElementById('account-create-phone').value.trim();
    const location = getAccountCreateLocation();
    const title = getAccountCreateTitle();
    const skillsStr = document.getElementById('account-create-skills').value.trim();
    const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const errEl = document.getElementById('account-create-error');
    if (!firstName || !lastName || !email || !password) {
        errEl.textContent = 'Please fill required fields (first name, last name, email, password).';
        errEl.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password, phone, location, title, skills, role: 'jobseeker' })
        });
        let result;
        try {
            const text = await response.text();
            result = text ? JSON.parse(text) : {};
        } catch (parseErr) {
            errEl.textContent = 'Server returned invalid response (status ' + response.status + '). Restart the app with "npm start" and open http://localhost:3000';
            errEl.style.display = 'block';
            return;
        }
        if (!result.statusCode && response.status !== 201) {
            errEl.textContent = result.message || 'Server error (status ' + response.status + '). Check the terminal where "npm start" is running.';
            errEl.style.display = 'block';
            return;
        }
        if (result.statusCode === 201 && result.data && result.data.token) {
            authToken = result.data.token;
            currentUser = result.data.user;
            localStorage.setItem('jobfinder_token', authToken);
            localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
            userProfile = {
                name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                email: currentUser.email,
                phone: currentUser.phone || '',
                location: currentUser.location || '',
                title: currentUser.title || '',
                skills: (currentUser.skills || []).join(', ')
            };
            localStorage.setItem('jobfinder_profile', JSON.stringify(userProfile));
            M.Modal.getInstance(document.getElementById('account-modal')).close();
            updateHeaderAuth();
            showToast('Profile created! Redirecting to jobs...', 'success');
            // Redirect to job finder page after signup
            setTimeout(() => {
                window.location.href = '/jobs';
            }, 500);
        } else {
            errEl.textContent = result.message || 'Create profile failed';
            errEl.style.display = 'block';
        }
    } catch (e) {
        console.error('Signup error:', e);
        errEl.textContent = 'Cannot reach server. Start the app with "npm start" and open http://localhost:3000 in your browser.';
        errEl.style.display = 'block';
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('jobfinder_token');
    localStorage.removeItem('jobfinder_user');
    localStorage.removeItem('jobfinder_profile');
    updateHeaderAuth();
    showToast('Logged out', 'info');
}

// ===== Profile Modal (view & edit when logged in) =====
function profileSwitchToView() {
    document.getElementById('profile-view-mode').style.display = 'block';
    document.getElementById('profile-edit-mode').style.display = 'none';
    document.getElementById('profile-footer-view').style.display = '';
    document.getElementById('profile-footer-edit').style.display = 'none';
    fillProfileView();
}

function profileSwitchToEdit() {
    document.getElementById('profile-view-mode').style.display = 'none';
    document.getElementById('profile-edit-mode').style.display = 'block';
    document.getElementById('profile-footer-view').style.display = 'none';
    document.getElementById('profile-footer-edit').style.display = '';
    fillProfileEditForm().then(() => M.updateTextFields());
}

function fillProfileView() {
    if (!currentUser) return;
    const u = currentUser;
    document.getElementById('profile-view-avatar').src = u.avatar || 'https://ui-avatars.com/api/?name=User&background=1976d2&color=fff';
    document.getElementById('profile-view-name').textContent = (u.firstName || '') + ' ' + (u.lastName || '');
    document.getElementById('profile-view-email').textContent = u.email || '';
    document.getElementById('profile-view-phone').textContent = u.phone || '—';
    document.getElementById('profile-view-location').textContent = u.location || '—';
    document.getElementById('profile-view-title').textContent = u.title || '—';
    document.getElementById('profile-view-skills').textContent = Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || '—');
}

async function fillProfileEditForm() {
    if (!currentUser) return;
    await loadJobTitlesForProfile();
    setupProfileLocationTitleOther();
    const u = currentUser;
    document.getElementById('profile-edit-firstName').value = u.firstName || '';
    document.getElementById('profile-edit-lastName').value = u.lastName || '';
    document.getElementById('profile-edit-email').value = u.email || '';
    document.getElementById('profile-edit-phone').value = u.phone || '';
    const locSel = document.getElementById('profile-edit-location');
    const locOther = document.getElementById('profile-edit-location-other');
    const titleSel = document.getElementById('profile-edit-title');
    const titleOther = document.getElementById('profile-edit-title-other');
    const loc = (u.location || '').trim();
    const title = (u.title || '').trim();
    if (locSel) {
        const hasOpt = Array.from(locSel.options).some(o => o.value === loc);
        if (hasOpt) {
            locSel.value = loc;
            if (locOther) locOther.style.display = 'none';
        } else {
            locSel.value = '__other__';
            if (locOther) { locOther.value = loc; locOther.style.display = 'block'; }
        }
    }
    if (titleSel) {
        const hasOpt = Array.from(titleSel.options).some(o => o.value === title);
        if (hasOpt) {
            titleSel.value = title;
            if (titleOther) titleOther.style.display = 'none';
        } else {
            titleSel.value = '__other__';
            if (titleOther) { titleOther.value = title; titleOther.style.display = 'block'; }
        }
    }
    document.getElementById('profile-edit-skills').value = Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || '');
    reinitFormSelect(locSel);
    reinitFormSelect(titleSel);
}

function openProfileModal() {
    openAccountModal();
}

async function submitProfileEdit() {
    if (!currentUser || !authToken) return;
    const errEl = document.getElementById('profile-edit-error');
    const firstName = document.getElementById('profile-edit-firstName').value.trim();
    const lastName = document.getElementById('profile-edit-lastName').value.trim();
    const phone = document.getElementById('profile-edit-phone').value.trim();
    const location = getProfileEditLocation();
    const title = getProfileEditTitle();
    const skillsStr = document.getElementById('profile-edit-skills').value.trim();
    const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!firstName || !lastName) {
        errEl.textContent = 'First name and last name are required.';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';
    try {
        const response = await fetch('/api/users/' + currentUser.id, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ firstName, lastName, phone, location, title, skills })
        });
        const result = await response.json();
        if (result.statusCode === 200 && result.data) {
            currentUser = result.data;
            userProfile = {
                name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                email: currentUser.email,
                phone: currentUser.phone || '',
                location: currentUser.location || '',
                title: currentUser.title || '',
                skills: (currentUser.skills || []).join(', ')
            };
            profileSwitchToView();
            fillProfileView();
            updateHeaderAuth();
            showToast('Profile updated', 'success');
        } else {
            errEl.textContent = result.message || 'Update failed';
            errEl.style.display = 'block';
        }
    } catch (e) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
}

// ===== Load User Profile from localStorage =====
function loadUserProfile() {
    const saved = localStorage.getItem('jobfinder_profile');
    if (saved) {
        userProfile = JSON.parse(saved);
    }
}

// ===== Load Jobs from API =====
let isLoadingJobs = false;
let loadJobsRequestId = 0;
async function loadJobs() {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    
    // Prevent concurrent loads - only one at a time
    if (isLoadingJobs) {
        console.log('[loadJobs] Already loading, skipping duplicate call');
        return;
    }
    
    isLoadingJobs = true;
    const thisRequestId = ++loadJobsRequestId;
    console.log('[loadJobs] Starting request #', thisRequestId);
    showLoading();
    
    try {
        const response = await fetch('/api/jobs');
        const result = await response.json();
        
        console.log('[loadJobs] Response for request #', thisRequestId, '- statusCode:', result.statusCode, 'data length:', result.data?.length);
        
        if (result.statusCode === 200 && Array.isArray(result.data)) {
            console.log('[loadJobs] Success! Setting allJobs to', result.data.length, 'jobs');
            allJobs = result.data;
            renderJobs(allJobs);
            const totalEl = document.getElementById('total-jobs');
            if (totalEl) totalEl.textContent = allJobs.length;
        } else if (allJobs.length > 0) {
            console.log('[loadJobs] Bad response but we have cached jobs, re-rendering');
            renderJobs(allJobs);
        } else {
            console.log('[loadJobs] Bad response and no cached jobs, showing error');
            showError('Failed to load jobs. Please refresh.');
        }
    } catch (error) {
        console.error('[loadJobs] Error:', error);
        if (allJobs.length > 0) {
            renderJobs(allJobs);
        } else {
            showError('Failed to load jobs. Please refresh.');
        }
    } finally {
        isLoadingJobs = false;
    }
}

// ===== Render Jobs - Streamlined Cards =====
// isFilterResult: true when called from filterJobs (empty is valid), false/undefined otherwise
function renderJobs(jobs, isFilterResult = false) {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    
    // Debug: trace who called renderJobs and with what
    console.log('[renderJobs] called with', jobs?.length ?? 0, 'jobs, isFilterResult:', isFilterResult, '. Caller:', new Error().stack?.split('\n')[2]?.trim());
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
        console.warn('[renderJobs] Would render empty. allJobs has:', allJobs?.length ?? 0, 'jobs, isFilterResult:', isFilterResult);
        // If not a filter result and we have cached jobs, use them instead
        if (!isFilterResult && allJobs && allJobs.length > 0) {
            console.log('[renderJobs] Not a filter, falling back to allJobs');
            jobs = allJobs;
        } else {
            container.innerHTML = `
                <div class="col s12 empty-state">
                    <i class="material-icons">search_off</i>
                    <h5 class="grey-text">No jobs found</h5>
                    <p class="grey-text">Try different search terms</p>
                </div>
            `;
            return;
        }
    }
    
    const safeJobs = jobs.map(job => ({
        id: job.id || job._id || '',
        title: job.title || '',
        company: job.company || '',
        location: job.location || '',
        type: job.type || '',
        salary: job.salary || '',
        logo: job.logo || '',
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        applicants: typeof job.applicants === 'number' ? job.applicants : 0,
        deadline: job.deadline || ''
    }));
    
    container.innerHTML = safeJobs.map((job, index) => {
        const matchScore = calculateMatchScore(job);
        const badge = getBadge(job);
        const safeId = (job.id || '').toString().replace(/'/g, "\\'");
        
        return `
            <div class="col s12 m6 l4">
                <div class="card job-card z-depth-1">
                    ${badge}
                    <div class="card-content">
                        <div class="job-header">
                            <img src="${job.logo || ''}" alt="${(job.company || '').replace(/"/g, '&quot;')}" class="job-logo">
                            <div>
                                <h6 class="job-title">${(job.title || '').replace(/</g, '&lt;')}</h6>
                                <p class="job-company">${(job.company || '').replace(/</g, '&lt;')}</p>
                            </div>
                        </div>
                        
                        <div class="job-meta">
                            <span class="job-meta-item">
                                <i class="material-icons">location_on</i>${(job.location || '').replace(/</g, '&lt;')}
                            </span>
                            <span class="job-meta-item">
                                <i class="material-icons">work</i>${(job.type || '').replace(/</g, '&lt;')}
                            </span>
                        </div>
                        
                        ${userProfile ? `
                        <div class="match-score">
                            <span>Match</span>
                            <div class="match-score-bar">
                                <div class="match-score-fill" style="width: ${matchScore}%"></div>
                            </div>
                            <span class="match-score-text">${matchScore}%</span>
                        </div>
                        ` : ''}
                        
                        <div class="job-actions">
                            <span class="job-salary">${(job.salary || '').replace(/</g, '&lt;')}</span>
                            <button class="btn waves-effect waves-light green quick-apply-btn" 
                                    onclick="event.stopPropagation(); goToJobs('${safeId}')">
                                <i class="material-icons left">bolt</i>Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Get Badge for Job =====
function getBadge(job) {
    if (job.type === 'Contract' || job.applicants < 5) {
        return `<span class="job-badge badge-instant"><i class="material-icons tiny">bolt</i>Quick Response</span>`;
    }
    if (job.type === 'Remote' || job.location.toLowerCase().includes('remote')) {
        return `<span class="job-badge badge-remote"><i class="material-icons tiny">home</i>Remote</span>`;
    }
    if (job.deadline && new Date(job.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000) {
        return `<span class="job-badge badge-urgent"><i class="material-icons tiny">priority_high</i>Urgent</span>`;
    }
    return '';
}

// ===== Calculate Match Score =====
function calculateMatchScore(job) {
    if (!userProfile || !userProfile.skills) return 0;
    const reqs = job.requirements;
    if (!reqs || !Array.isArray(reqs)) return 0;
    
    const userSkills = userProfile.skills.toLowerCase().split(',').map(s => s.trim());
    const jobRequirements = reqs.map(r => String(r).toLowerCase());
    
    let matches = 0;
    userSkills.forEach(skill => {
        if (jobRequirements.some(req => req.includes(skill))) {
            matches++;
        }
    });
    
    return Math.min(Math.round((matches / Math.max(jobRequirements.length, 1)) * 100) + 40, 98);
}

// ===== Go to Jobs Page =====
// When called with jobId (from Apply button on job cards): go to /jobs?apply=jobId
// When called without jobId (from Find Jobs button): check dropdown, fetch first matching job, go to /jobs?apply=thatJobId
async function goToJobs(jobId) {
    if (jobId) {
        window.location.href = '/jobs?apply=' + encodeURIComponent(jobId);
        return;
    }
    const keyword = getQuickSearchKeyword();
    if (keyword) {
        try {
            const res = await fetch('/api/jobs/search?keyword=' + encodeURIComponent(keyword));
            const data = await res.json();
            if (data.statusCode === 200 && Array.isArray(data.data) && data.data.length > 0) {
                window.location.href = '/jobs?apply=' + encodeURIComponent(data.data[0].id);
                return;
            }
        } catch (e) {}
    }
    window.location.href = '/jobs';
}

// ===== Quick Search (for jobs section on home page) =====
async function quickSearch() {
    const keyword = getQuickSearchKeyword();
    
    if (!keyword) {
        loadJobs();
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/search?keyword=${encodeURIComponent(keyword)}`);
        const result = await response.json();
        
        if (result.statusCode === 200) {
            allJobs = result.data;
            renderJobs(allJobs);
            
            // Scroll to jobs
            const jobsSection = document.getElementById('jobs-section');
            if (jobsSection) jobsSection.scrollIntoView({ behavior: 'smooth' });
            showToast(`Found ${result.count} jobs`, 'info');
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

// ===== Filter Jobs =====
function filterJobs(filter) {
    console.log('[filterJobs] filter:', filter, 'allJobs.length:', allJobs?.length);
    let filtered = [...allJobs];
    
    switch(filter) {
        case 'all':
            // Show all jobs (no additional filtering)
            break;
        case 'instant':
            filtered = allJobs.filter(j => j.applicants < 10);
            break;
        case 'remote':
            filtered = allJobs.filter(j => 
                j.location && (j.location.toLowerCase().includes('remote') || j.type === 'Remote')
            );
            break;
        case 'urgent':
            filtered = allJobs.filter(j => {
                if (!j.deadline) return false;
                return new Date(j.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000;
            });
            break;
        default:
            console.warn('[filterJobs] Unknown filter:', filter);
    }
    
    console.log('[filterJobs] filtered to', filtered.length, 'jobs');
    renderJobs(filtered, true);  // true = this is a filter result, empty is valid
}

// ===== View Job Details =====
async function viewJob(jobId) {
    try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const result = await response.json();
        
        if (result.statusCode === 200) {
            selectedJob = result.data;
            renderJobDetail(selectedJob);
            M.Modal.getInstance(document.getElementById('job-detail-modal')).open();
        }
    } catch (error) {
        console.error('Error loading job:', error);
    }
}

// ===== Render Job Detail =====
function renderJobDetail(job) {
    const container = document.getElementById('job-detail-content');
    const matchScore = calculateMatchScore(job);
    
    container.innerHTML = `
        <div class="job-detail-header">
            <img src="${job.logo}" alt="${job.company}" class="job-logo">
            <div>
                <h5 class="job-title">${job.title}</h5>
                <p class="job-company">${job.company}</p>
                <div class="job-meta">
                    <span class="job-meta-item"><i class="material-icons">location_on</i>${job.location}</span>
                    <span class="job-meta-item"><i class="material-icons">work</i>${job.type}</span>
                    <span class="job-meta-item"><i class="material-icons">payments</i>${job.salary}</span>
                </div>
            </div>
        </div>
        
        ${userProfile ? `
        <div class="match-score" style="margin-bottom: 25px;">
            <span><strong>Your Match Score:</strong></span>
            <div class="match-score-bar" style="flex: 1;">
                <div class="match-score-fill" style="width: ${matchScore}%"></div>
            </div>
            <span class="match-score-text">${matchScore}%</span>
        </div>
        ` : `
        <div class="card-panel amber lighten-4" style="border-radius: 10px;">
            <i class="material-icons left">info</i>
            <strong>Create a Quick Profile</strong> to see your match score and apply instantly!
        </div>
        `}
        
        <div class="detail-section">
            <h6><i class="material-icons">description</i>About This Role</h6>
            <p>${job.description}</p>
        </div>
        
        <div class="detail-section">
            <h6><i class="material-icons">checklist</i>Requirements</h6>
            <ul class="requirement-list">
                ${job.requirements.map(req => `
                    <li><i class="material-icons small">check_circle</i>${req}</li>
                `).join('')}
            </ul>
        </div>
        
        <div class="detail-section">
            <h6><i class="material-icons">card_giftcard</i>Benefits</h6>
            <ul class="benefit-list">
                ${job.benefits.map(benefit => `
                    <li><i class="material-icons small">star</i>${benefit}</li>
                `).join('')}
            </ul>
        </div>
        
        <div class="row">
            <div class="col s6">
                <p class="grey-text"><small><i class="material-icons tiny">calendar_today</i> Posted: ${job.postedDate}</small></p>
            </div>
            <div class="col s6 right-align">
                <p class="grey-text"><small><i class="material-icons tiny">people</i> ${job.applicants} applicants</small></p>
            </div>
        </div>
    `;
}

// ===== Quick Apply - Open Modal =====
function quickApply(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    
    selectedJob = job;
    
    // Require profile (logged-in user or created profile)
    if (!currentUser && !userProfile) {
        showToast('Create a profile or log in to Quick Apply', 'warning');
        openAccountModal();
        showAccountPanel('create');
        return;
    }
    if (currentUser && !userProfile) {
        userProfile = {
            name: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
            email: currentUser.email,
            phone: currentUser.phone || '',
            location: currentUser.location || '',
            title: currentUser.title || '',
            skills: (currentUser.skills || []).join(', ')
        };
    }
    
    // Close detail modal if open
    const detailModal = M.Modal.getInstance(document.getElementById('job-detail-modal'));
    if (detailModal && detailModal.isOpen) {
        detailModal.close();
    }
    
    // Populate quick apply modal
    document.getElementById('apply-job-info').innerHTML = `
        <h5>${job.title}</h5>
        <p class="grey-text">${job.company} • ${job.location}</p>
    `;
    
    document.getElementById('apply-profile-preview').innerHTML = `
        <h6 style="margin-top: 0;"><i class="material-icons left">person</i>Your Quick Profile</h6>
        <div class="profile-preview-item">
            <i class="material-icons">badge</i>
            <span><strong>${userProfile.name}</strong></span>
        </div>
        <div class="profile-preview-item">
            <i class="material-icons">email</i>
            <span>${userProfile.email}</span>
        </div>
        <div class="profile-preview-item">
            <i class="material-icons">phone</i>
            <span>${userProfile.phone}</span>
        </div>
        ${userProfile.title ? `
        <div class="profile-preview-item">
            <i class="material-icons">work</i>
            <span>${userProfile.title}</span>
        </div>
        ` : ''}
        ${userProfile.skills ? `
        <div class="profile-preview-item">
            <i class="material-icons">psychology</i>
            <span>${userProfile.skills}</span>
        </div>
        ` : ''}
    `;
    
    M.Modal.getInstance(document.getElementById('quick-apply-modal')).open();
}

// ===== Open Quick Apply from Detail Modal =====
function openQuickApply() {
    if (selectedJob) {
        quickApply(selectedJob.id);
    }
}

// ===== Submit Quick Apply =====
async function submitQuickApply() {
    if (!selectedJob || !userProfile) return;
    
    const applicationData = {
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        company: selectedJob.company,
        userId: 'user-' + Date.now(),
        applicantName: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location,
        coverLetter: document.getElementById('quick-message').value || 'Quick application via JobFinder'
    };
    
    // Emit via Socket.IO for real-time
    socket.emit('applyJob', applicationData);
    
    // Also POST to API
    try {
        const response = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
        });
        
        const result = await response.json();
        
        if (result.statusCode === 201) {
            // Close quick apply modal
            M.Modal.getInstance(document.getElementById('quick-apply-modal')).close();
            // Open success modal
            M.Modal.getInstance(document.getElementById('success-modal')).open();
            
            // Clear message field
            document.getElementById('quick-message').value = '';
        }
    } catch (error) {
        console.error('Application error:', error);
        showToast('Failed to submit application', 'error');
    }
}

// ===== Schedule Interview (for demo) =====
function showInterviewScheduler(applicationId) {
    const container = document.getElementById('interview-slots');
    
    // Generate next 5 available slots
    const slots = generateInterviewSlots();
    
    container.innerHTML = slots.map((slot, index) => `
        <div class="interview-slot" onclick="selectSlot(this, ${index})">
            <div class="slot-date">${slot.date}</div>
            <div class="slot-time">${slot.time}</div>
        </div>
    `).join('');
    
    M.Modal.getInstance(document.getElementById('interview-modal')).open();
}

function generateInterviewSlots() {
    const slots = [];
    const times = ['10:00 AM', '2:00 PM', '4:00 PM'];
    const today = new Date();
    
    for (let i = 1; i <= 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
            slots.push({
                date: date.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' }),
                time: times[Math.floor(Math.random() * times.length)]
            });
        }
    }
    
    return slots.slice(0, 4);
}

function selectSlot(element, index) {
    document.querySelectorAll('.interview-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

function confirmInterview() {
    const selected = document.querySelector('.interview-slot.selected');
    if (!selected) {
        showToast('Please select a time slot', 'warning');
        return;
    }
    
    M.Modal.getInstance(document.getElementById('interview-modal')).close();
    showToast('Interview confirmed! Check your email for details.', 'success');
}

// ==================== EMPLOYER FUNCTIONS ====================

// ===== Load Employer Jobs (same as all jobs for demo; in production filter by employerId) =====
async function loadEmployerJobs() {
    const container = document.getElementById('employer-jobs-container');
    if (!container) return;
    
    try {
        // Fetch only jobs posted by the current employer
        const response = await fetch('/api/jobs/me', {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (result.statusCode === 200) {
            const jobs = result.data;
            renderEmployerJobs(jobs);
        } else {
            container.innerHTML = '<div class="col s12 center-align grey-text">No jobs yet. Post your first job!</div>';
        }
    } catch (error) {
        console.error('Error loading employer jobs:', error);
        container.innerHTML = '<div class="col s12 center-align grey-text">Failed to load jobs.</div>';
    }
}

function renderEmployerJobs(jobs) {
    const container = document.getElementById('employer-jobs-container');
    if (!container) return;
    
    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="col s12 empty-state">
                <i class="material-icons grey-text">work_off</i>
                <h5 class="grey-text">No jobs yet</h5>
                <p class="grey-text">Post your first job to start receiving applications</p>
                <button class="btn orange modal-trigger" data-target="post-job-modal">
                    <i class="material-icons left">post_add</i>Post a Job
                </button>
            </div>
        `;
        return;
    }
    
    // Load applications count per job
    fetch('/api/applications').then(r => r.json()).then(res => {
        const appsByJob = {};
        (res.data || []).forEach(app => {
            appsByJob[app.jobId] = (appsByJob[app.jobId] || 0) + 1;
        });
        
        container.innerHTML = jobs.map(job => {
            const appCount = appsByJob[job.id] || 0;
            const hasNew = appCount > 0;
            const safeTitle = (job.title || '').replace(/'/g, "\\'");
            return '<div class="col s12 m6 l4">' +
                '<div class="card employer-job-card z-depth-1">' +
                '<div class="card-content">' +
                '<h6 class="job-title">' + job.title + '</h6>' +
                '<p class="job-company">' + job.company + '</p>' +
                '<div class="job-meta-row">' +
                '<span><i class="material-icons tiny">location_on</i>' + job.location + '</span>' +
                '<span><i class="material-icons tiny">work</i>' + job.type + '</span>' +
                '</div>' +
                '<div class="applications-count ' + (hasNew ? 'new' : '') + '">' +
                '<i class="material-icons">assignment</i> ' + appCount + ' application' + (appCount !== 1 ? 's' : '') +
                '</div>' +
                '<div class="card-actions">' +
                '<button class="btn waves-effect waves-light blue btn-small" onclick="openApplicationsModal(\'' + job.id + '\', \'' + safeTitle + '\')">' +
                '<i class="material-icons left">people</i>View</button>' +
                '</div></div></div></div>';
        }).join('');
    }).catch(() => {
        container.innerHTML = jobs.map(job => {
            const safeTitle = (job.title || '').replace(/'/g, "\\'");
            return '<div class="col s12 m6 l4"><div class="card employer-job-card z-depth-1"><div class="card-content">' +
                '<h6 class="job-title">' + job.title + '</h6>' +
                '<p class="job-company">' + job.company + '</p>' +
                '<div class="applications-count"><i class="material-icons">assignment</i>0 applications</div>' +
                '<div class="card-actions">' +
                '<button class="btn waves-effect waves-light blue btn-small" onclick="openApplicationsModal(\'' + job.id + '\', \'' + safeTitle + '\')">' +
                '<i class="material-icons left">people</i>View</button></div></div></div></div>';
        }).join('');
    });
}

async function loadEmployerStats() {
    try {
        // Fetch employer's own jobs
        const jobsRes = await fetch('/api/jobs/me', { headers: getAuthHeaders() });
        const jobsData = await jobsRes.json();
        const employerJobs = jobsData.data || [];
        const jobCount = employerJobs.length;
        
        // Get job IDs for this employer
        const employerJobIds = employerJobs.map(j => j.id);
        
        // Fetch all applications and filter by employer's jobs
        const appsRes = await fetch('/api/applications', { headers: getAuthHeaders() });
        const appsData = await appsRes.json();
        const allApps = appsData.data || [];
        
        // Count only applications for this employer's jobs
        const appCount = allApps.filter(app => employerJobIds.includes(app.jobId)).length;
        
        const jobsEl = document.getElementById('employer-jobs-count');
        const appsEl = document.getElementById('employer-apps-count');
        if (jobsEl) jobsEl.textContent = jobCount;
        if (appsEl) appsEl.textContent = appCount;
    } catch (e) {
        console.error(e);
    }
}

// ===== Post Job =====
async function submitPostJob() {
    const title = document.getElementById('job-title').value.trim();
    const company = document.getElementById('job-company').value.trim();
    const location = document.getElementById('job-location').value.trim();
    const type = document.getElementById('job-type').value;
    const category = document.getElementById('job-category').value.trim() || 'Technology';
    const salary = document.getElementById('job-salary').value.trim() || 'Competitive';
    const description = document.getElementById('job-description').value.trim();
    const requirementsStr = document.getElementById('job-requirements').value.trim();
    const benefitsStr = document.getElementById('job-benefits').value.trim();
    
    if (!title || !company || !location || !type || !description) {
        showToast('Please fill in required fields (Title, Company, Location, Type, Description)', 'warning');
        return;
    }
    
    const requirements = requirementsStr ? requirementsStr.split(',').map(s => s.trim()) : ['See description'];
    const benefits = benefitsStr ? benefitsStr.split(',').map(s => s.trim()) : ['Competitive package'];
    
    const jobData = {
        title,
        company,
        location,
        type,
        category,
        salary,
        description,
        requirements,
        benefits,
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(company.substring(0, 2))}&background=1565c0&color=fff&size=100`
    };
    
    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(jobData)
        });
        const result = await response.json();
        
        if (result.statusCode === 201) {
            showToast('Job published successfully!', 'success');
            M.Modal.getInstance(document.getElementById('post-job-modal')).close();
            document.getElementById('post-job-form').reset();
            M.FormSelect.init(document.querySelectorAll('#post-job-modal select'));
            
            allJobs.unshift(result.data);
            if (currentUserRole === 'employer') {
                loadEmployerJobs();
                loadEmployerStats();
            } else {
                document.getElementById('total-jobs').textContent = allJobs.length;
            }
        } else {
            showToast('Failed to publish job', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Failed to publish job', 'error');
    }
}

// ===== View Applications for a Job =====
async function openApplicationsModal(jobId, jobTitle) {
    document.getElementById('applications-job-title').textContent = jobTitle || 'Applications';
    
    try {
        const response = await fetch('/api/applications', { headers: getAuthHeaders() });
        const result = await response.json();
        
        if (result.statusCode === 200) {
            allApplications = (result.data || []).filter(app => app.jobId === jobId);
            renderApplicationsList(allApplications);
        } else {
            document.getElementById('applications-list').innerHTML = '<p class="center-align grey-text">No applications yet.</p>';
        }
    } catch (error) {
        document.getElementById('applications-list').innerHTML = '<p class="center-align red-text">Failed to load applications.</p>';
    }
    
    M.Modal.getInstance(document.getElementById('applications-modal')).open();
}

function renderApplicationsList(applications) {
    const container = document.getElementById('applications-list');
    
    if (applications.length === 0) {
        container.innerHTML = `
            <div class="center-align" style="padding: 40px;">
                <i class="material-icons large grey-text">assignment</i>
                <h5 class="grey-text">No applications yet</h5>
                <p class="grey-text">Applications will appear here when candidates apply</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = applications.map(app => `
        <div class="card applicant-card">
            <div class="card-content">
                <div class="applicant-header">
                    <div>
                        <span class="applicant-name">${app.applicantName || 'Applicant'}</span>
                        <span class="applicant-status ${app.status || 'submitted'}">${formatStatus(app.status || 'submitted')}</span>
                    </div>
                </div>
                <div class="applicant-meta">
                    <span><i class="material-icons">email</i>${app.email || '-'}</span>
                    <span><i class="material-icons">phone</i>${app.phone || '-'}</span>
                </div>
                ${app.coverLetter ? `<p class="grey-text" style="font-size: 0.9rem;">${app.coverLetter.substring(0, 150)}${app.coverLetter.length > 150 ? '...' : ''}</p>` : ''}
                <button class="btn btn-flat blue-text view-detail-btn" onclick="openApplicantDetail('${app.id}')">
                    <i class="material-icons left">visibility</i>View & Update Status
                </button>
            </div>
        </div>
    `).join('');
}

function formatStatus(status) {
    const labels = {
        submitted: 'Submitted',
        under_review: 'Under Review',
        interview_scheduled: 'Interview Scheduled',
        offered: 'Offer',
        rejected: 'Not Selected'
    };
    return labels[status] || status;
}

// ===== Applicant Detail Modal =====
function openApplicantDetail(appId) {
    selectedApplicationId = appId;
    const app = allApplications.find(a => a.id === appId);
    if (!app) return;
    
    const content = document.getElementById('applicant-detail-content');
    content.innerHTML = `
        <div class="row">
            <div class="col s12 m6">
                <p><strong>Name:</strong> ${app.applicantName || '-'}</p>
                <p><strong>Email:</strong> ${app.email || '-'}</p>
                <p><strong>Phone:</strong> ${app.phone || '-'}</p>
            </div>
            <div class="col s12 m6">
                <p><strong>Applied:</strong> ${app.appliedDate || '-'}</p>
                <p><strong>Status:</strong> ${formatStatus(app.status || 'submitted')}</p>
            </div>
        </div>
        ${app.coverLetter ? `
        <div class="row">
            <div class="col s12">
                <h6>Cover Letter</h6>
                <p class="grey-text">${app.coverLetter}</p>
            </div>
        </div>
        ` : ''}
    `;
    
    M.Modal.getInstance(document.getElementById('applications-modal')).close();
    M.Modal.getInstance(document.getElementById('applicant-detail-modal')).open();
}

// ===== Update Application Status =====
async function updateAppStatus(status) {
    if (!selectedApplicationId) return;
    
    try {
        const response = await fetch(`/api/applications/${selectedApplicationId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await response.json();
        
        if (result.statusCode === 200) {
            showToast(`Status updated to ${formatStatus(status)}`, 'success');
            const app = allApplications.find(a => a.id === selectedApplicationId);
            if (app) app.status = status;
            
            M.Modal.getInstance(document.getElementById('applicant-detail-modal')).close();
            selectedApplicationId = null;
            
            if (currentUserRole === 'employer') {
                loadEmployerJobs();
                loadEmployerStats();
            }
        } else {
            showToast('Failed to update status', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Failed to update status', 'error');
    }
}

function editJob(jobId) {
    // Placeholder for edit job - could open post-job modal with pre-filled data
}

// ===== Utility Functions =====
function showToast(message, type = 'info') {
    const colors = {
        success: 'green',
        error: 'red',
        warning: 'orange',
        info: 'blue'
    };
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    
    M.toast({
        html: `<i class="material-icons left">${icons[type]}</i>${message}`,
        classes: colors[type],
        displayLength: 3000
    });
}

function updateConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    if (connected) {
        el.innerHTML = '<i class="material-icons tiny green-text">fiber_manual_record</i> Connected';
    } else {
        el.innerHTML = '<i class="material-icons tiny red-text">fiber_manual_record</i> Offline';
    }
}

function showLoading() {
    document.getElementById('jobs-container').innerHTML = `
        <div class="col s12 loading-container">
            <div class="preloader-wrapper active">
                <div class="spinner-layer spinner-blue-only">
                    <div class="circle-clipper left"><div class="circle"></div></div>
                    <div class="gap-patch"><div class="circle"></div></div>
                    <div class="circle-clipper right"><div class="circle"></div></div>
                </div>
            </div>
        </div>
    `;
}

function showError(message) {
    document.getElementById('jobs-container').innerHTML = `
        <div class="col s12 empty-state">
            <i class="material-icons red-text">error</i>
            <h5 class="grey-text">${message}</h5>
            <button class="btn blue" onclick="loadJobs()">
                <i class="material-icons left">refresh</i>Retry
            </button>
        </div>
    `;
}
