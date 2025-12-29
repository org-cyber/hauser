
// js/agency-branding.js - Dedicated branded agency page
async function loadAgencyFromSlug() {
    // Get slug from URL: /elite-properties → "elite-properties"
    let pathSlug = window.location.pathname.slice(1).split('/')[0].toLowerCase().trim();

    if (!pathSlug) {
        document.body.innerHTML = "<h2>No agency specified</h2>";
        return;
    }

    try {
        const db = firebase.firestore();

        // Find workspace by slug
        const snapshot = await db.collection('workspaces')
            .where('slug', '==', pathSlug)
            .limit(1)
            .get();

        if (snapshot.empty) {
            document.body.innerHTML = `<h2>Agency "${pathSlug}" not found</h2><p>Please check the URL or contact support.</p>`;
            return;
        }

        const agency = snapshot.docs[0].data();
        const ownerUid = agency.ownerUid; // Make sure you save this when creating workspace

        // Apply branding
        document.title = `${agency.agencyName || 'Real Estate Agency'} - Properties`;

        if (agency.logoUrl) {
            document.querySelector('.agency-logo').src = agency.logoUrl;
            document.querySelector('.agency-logo').style.display = 'block';
        }

        document.querySelector('.agency-name').textContent = agency.agencyName || 'Agency';

        const aboutEl = document.querySelector('.agency-about');
        if (agency.about) {
            aboutEl.textContent = agency.about;
        } else {
            aboutEl.textContent = "Welcome to our listings.";
        }

        // Contact info
        if (agency.phone) document.querySelector('.agency-phone').textContent = `Phone: ${agency.phone}`;
        if (agency.email) document.querySelector('.agency-email').textContent = `Email: ${agency.email}`;
        if (agency.address) document.querySelector('.agency-address').textContent = `Address: ${agency.address}`;

        // Colors
        document.documentElement.style.setProperty('--primary-color', agency.primaryColor || '#2563eb');
        document.documentElement.style.setProperty('--secondary-color', agency.secondaryColor || '#1e40af');

        // White label
        if (agency.whiteLabel) {
            document.querySelectorAll('.powered-by-hauser').forEach(el => el.style.display = 'none');
        }

        // Load properties
        if (!ownerUid) {
            document.getElementById('properties-grid').innerHTML = "<p>No properties (owner not linked).</p>";
            return;
        }

        const propSnapshot = await db.collection('properties')
            .where('ownerUid', '==', ownerUid)
            .orderBy('createdAt', 'desc')
            .get();

        const grid = document.getElementById('properties-grid');
        if (propSnapshot.empty) {
            grid.innerHTML = "<p>No properties listed yet.</p>";
            return;
        }

        let html = '';
        propSnapshot.forEach(doc => {
            const p = doc.data();
            const firstPhoto = p.photos && p.photos.length > 0 ? p.photos[0] : 'img/placeholder.jpg';
            html += `
        <div class="property-card">
          <img src="${firstPhoto}" alt="${p.title || 'Property'}">
          <h3>${p.title || 'Untitled'}</h3>
          <p>${p.location || ''}</p>
          <p class="price">₦${(p.price || 0).toLocaleString()}</p>
          <a href="/property-detail.html?id=${doc.id}" class="view-btn">View Details</a>
        </div>
      `;
        });
        grid.innerHTML = html;

    } catch (error) {
        console.error("Error:", error);
        document.body.innerHTML = "<h2>Error loading agency page</h2>";
    }
}

// Run when page loads
document.addEventListener('DOMContentLoaded', loadAgencyFromSlug);
