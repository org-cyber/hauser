/**
 * branding.js - FIXED VERSION
 * 
 * CRITICAL ERRORS FIXED:
 * ========================
 * 
 * ❌ ERROR 1: Wrong Field Name
 * Line: .where('listingOwnerUid', '==', ownerUid)
 * Problem: Properties collection uses 'uid' field, NOT 'listingOwnerUid'
 * Fix: Changed to .where('uid', '==', ownerUid)
 * 
 * ❌ ERROR 2: Firebase Index Requirement
 * Line: .where('listingOwnerUid').orderBy('createdAt', 'desc')
 * Problem: Compound query requires Firebase index (causes error in console)
 * Fix: Removed .orderBy(), sort on client side instead
 * 
 * ❌ ERROR 3: Missing Placeholder Image
 * Line: const firstImg = ... : 'img/placeholder.jpg';
 * Problem: File doesn't exist, causes 404 error
 * Fix: Use inline SVG data URI
 * 
 * ❌ ERROR 4: Selector Mismatch
 * Problem: HTML uses id="agencyName" but JS uses .agency-name (class)
 * Fix: Updated selectors to match HTML structure
 * 
 * ❌ ERROR 5: No Error Handling
 * Problem: No checks for null elements
 * Fix: Added null checks before accessing elements
 */

async function loadAgencyFromSlug() {
    // Get slug from URL path
    let pathSlug = window.location.pathname.slice(1).split('/')[0].toLowerCase().trim();

    // Don't load for main site pages
    const mainPages = ['', 'index.html', 'vacancies.html', 'login.html', 'signup.html', 'dashboard.html', 'agency-branding.html'];
    if (!pathSlug || mainPages.includes(pathSlug)) {
        showError("No agency specified", "This page displays agency listings.");
        return;
    }

    try {
        const db = firebase.firestore();

        // Show loading state
        showLoading();

        // ===== STEP 1: Load workspace by slug =====
        const snapshot = await db.collection('workspaces')
            .where('slug', '==', pathSlug)
            .limit(1)
            .get();

        if (snapshot.empty) {
            showError(`Agency "${pathSlug}" not found`, "Please check the URL or contact the agency.");
            return;
        }

        const agency = snapshot.docs[0].data();
        const ownerUid = agency.ownerUid;

        if (!ownerUid) {
            showError("Invalid agency configuration", "Owner information is missing.");
            return;
        }

        // ===== STEP 2: Apply branding =====
        applyAgencyBranding(agency);

        // ===== STEP 3: Load properties =====
        // ✅ FIXED: Changed 'listingOwnerUid' to 'uid' (correct field name)
        // ✅ FIXED: Removed .orderBy() to avoid index requirement
        const propSnapshot = await db.collection('properties')
            .where('uid', '==', ownerUid)  // ✅ CORRECT: 'uid' not 'listingOwnerUid'
            .get();  // ✅ FIXED: No .orderBy() to avoid compound index

        // Get properties array
        let properties = propSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // ✅ FIXED: Sort on client side (no index needed)
        properties.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime; // Newest first
        });

        // Render properties
        renderProperties(properties);

        // Hide loading, show content
        hideLoading();

    } catch (error) {
        console.error("Error loading agency page:", error);
        showError("Error loading page", error.message || "An unexpected error occurred. Please try again.");
    }
}

/**
 * Apply agency branding to page elements
 */
function applyAgencyBranding(agency) {
    // Set page title
    document.title = `${agency.agencyName || 'Real Estate Agency'} - Properties`;

    // ✅ FIXED: Use correct ID selectors
    const nameEl = document.getElementById('agencyName');
    if (nameEl) {
        nameEl.textContent = agency.agencyName || 'Our Agency';
    }

    // Logo
    if (agency.logoUrl) {
        const logo = document.getElementById('agencyLogo');
        if (logo) {
            logo.src = agency.logoUrl;
            logo.classList.add('show');
            logo.onerror = () => {
                console.warn('Failed to load logo');
                logo.style.display = 'none';
            };
        }
    }

    // Hero background image
    if (agency.heroImageUrl) {
        const header = document.getElementById('agencyHeader');
        if (header) {
            header.style.backgroundImage = `url(${agency.heroImageUrl})`;
            header.style.backgroundSize = 'cover';
            header.style.backgroundPosition = 'center';
        }
    }

    // Tagline
    if (agency.heroTagline) {
        const tagline = document.getElementById('heroTagline');
        if (tagline) {
            tagline.textContent = agency.heroTagline;
            tagline.classList.add('show');
        }
    }

    // About text
    if (agency.about) {
        const aboutEl = document.getElementById('agencyAbout');
        const aboutSection = document.getElementById('aboutSection');
        if (aboutEl) {
            aboutEl.textContent = agency.about;
            if (aboutSection) aboutSection.classList.add('show');
        }
    }

    // Contact info
    let hasContact = false;

    if (agency.phone) {
        const phoneLink = document.getElementById('phoneLink');
        const phoneDisplay = document.getElementById('phoneDisplay');
        if (phoneLink && phoneDisplay) {
            phoneLink.textContent = agency.phone;
            phoneLink.href = `tel:${agency.phone}`;
            phoneDisplay.style.display = 'block';
            hasContact = true;
        }
    }

    if (agency.email) {
        const emailLink = document.getElementById('emailLink');
        const emailDisplay = document.getElementById('emailDisplay');
        if (emailLink && emailDisplay) {
            emailLink.textContent = agency.email;
            emailLink.href = `mailto:${agency.email}`;
            emailDisplay.style.display = 'block';
            hasContact = true;
        }
    }

    if (hasContact) {
        const contactInfo = document.getElementById('contactInfo');
        if (contactInfo) contactInfo.classList.add('show');
    }

    // Hide "Powered by Hauser" if white label
    if (agency.whiteLabel) {
        const poweredBy = document.getElementById('poweredBy');
        if (poweredBy) poweredBy.style.display = 'none';
    }
}

/**
 * Render properties to grid
 */
function renderProperties(properties) {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) {
        console.error('Properties grid element not found');
        return;
    }

    if (properties.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No Properties Listed Yet</h3>
                <p>Check back soon for new listings!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = ''; // Clear loading

    properties.forEach(p => {
        const card = createPropertyCard(p);
        grid.appendChild(card);
    });
}

/**
 * Create property card element
 */
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';

    // ✅ FIXED: Use inline SVG instead of missing img/placeholder.jpg
    const media = Array.isArray(property.media) ? property.media : [];
    const images = Array.isArray(property.images) ? property.images : [];

    const imageUrl = images[0] || media[0]?.url ||
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"%3E%3Crect fill="%23e2e8f0" width="400" height="240"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%2394a3b8" font-family="Inter" font-size="20" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';

    const title = escapeHtml(property.title || 'Untitled Property');
    const location = escapeHtml(property.location || '');
    const state = property.state ? escapeHtml(property.state) : '';
    const price = (property.price || 0).toLocaleString();
    const description = property.description || '';
    const truncatedDesc = description.length > 120 ? description.substring(0, 120) + '...' : description;

    card.innerHTML = `
        <img 
            src="${imageUrl}" 
            alt="${title}" 
            class="property-image" 
            loading="lazy"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 400 240\\'%3E%3Crect fill=\\'%23e2e8f0\\' width=\\'400\\' height=\\'240\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' fill=\\'%2394a3b8\\' font-family=\\'Inter\\' font-size=\\'20\\' dy=\\'.3em\\'%3ENo Image%3C/text%3E%3C/svg%3E'"
        >
        <div class="property-content">
            <h3 class="property-title">${title}</h3>
            <div class="property-location">📍 ${location}${location && state ? ', ' : ''}${state}</div>
            ${truncatedDesc ? `<p class="property-description">${escapeHtml(truncatedDesc)}</p>` : ''}
            <div class="property-price">₦${price}</div>
            <a href="property-details.html?id=${property.id}" class="view-btn">View Details</a>
        </div>
    `;

    return card;
}

/**
 * Show loading state
 */
function showLoading() {
    const loading = document.getElementById('loadingContainer');
    const main = document.getElementById('mainContent');
    const error = document.getElementById('errorContainer');

    if (loading) loading.style.display = 'flex';
    if (main) main.style.display = 'none';
    if (error) error.classList.remove('show');
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loading = document.getElementById('loadingContainer');
    const main = document.getElementById('mainContent');

    if (loading) loading.style.display = 'none';
    if (main) main.style.display = 'block';
}

/**
 * Show error state
 */
function showError(title, message = "") {
    const loading = document.getElementById('loadingContainer');
    const main = document.getElementById('mainContent');
    const error = document.getElementById('errorContainer');

    if (loading) loading.style.display = 'none';
    if (main) main.style.display = 'none';
    if (error) {
        error.classList.add('show');

        // Update error message if custom HTML needed
        const errorTitle = error.querySelector('.error-title');
        const errorText = error.querySelector('.error-text');
        if (errorTitle) errorTitle.textContent = title;
        if (errorText) errorText.textContent = message;
    }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', loadAgencyFromSlug);

/**
 * ========================================
 * ERROR ANALYSIS SUMMARY
 * ========================================
 * 
 * Original Code Had These Critical Errors:
 * 
 * 1. ❌ FIELD NAME ERROR
 *    Line: .where('listingOwnerUid', '==', ownerUid)
 *    Issue: Properties use 'uid' field, not 'listingOwnerUid'
 *    Result: No properties ever loaded
 *    Fixed: Changed to 'uid'
 * 
 * 2. ❌ FIREBASE INDEX ERROR
 *    Line: .where().orderBy('createdAt', 'desc')
 *    Issue: Compound query requires index creation
 *    Result: Firebase throws "requires an index" error
 *    Fixed: Removed .orderBy(), sort on client
 * 
 * 3. ❌ 404 ERROR
 *    Line: 'img/placeholder.jpg'
 *    Issue: File doesn't exist
 *    Result: Console 404 errors
 *    Fixed: Inline SVG data URI
 * 
 * 4. ❌ SELECTOR MISMATCH
 *    Line: document.querySelector('.agency-name')
 *    Issue: HTML has id="agencyName", not class
 *    Result: Elements not found, null errors
 *    Fixed: Use getElementById
 * 
 * 5. ❌ NO ERROR HANDLING
 *    Issue: No null checks
 *    Result: Errors when elements missing
 *    Fixed: Added null checks everywhere
 * 
 * Performance Impact:
 * - Old: Required Firebase index (manual setup)
 * - New: Works immediately, no configuration
 * 
 * Compatibility:
 * - Works with agency-slug-page.html
 * - No external dependencies
 * - No 404 errors
 * - Proper error handling
 */
