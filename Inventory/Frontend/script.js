// Inventory Management System JavaScript

// Data Storage (In production, this would be connected to backend)
let products = [];
let locations = [];
let movements = [];
let currentEditId = null;
let currentEditType = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSampleData();
    updateDashboard();
    setupEventListeners();
});

// Initialize the application
function initializeApp() {
    // Load data from localStorage if available
    loadDataFromStorage();
    
    // Set up navigation
    setupNavigation();
    
    // Show dashboard by default
    showPage('dashboard');
}

// Setup navigation functionality
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            showPage(page);
            
            // Update active nav button
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show specific page
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Refresh data when switching pages
        switch(pageId) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'products':
                refreshProductsTable();
                break;
            case 'locations':
                refreshLocationsTable();
                break;
            case 'movements':
                refreshMovementsTable();
                populateMovementDropdowns();
                break;
            case 'reports':
                generateReport();
                break;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Product form
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    
    // Location form
    document.getElementById('location-form').addEventListener('submit', handleLocationSubmit);
    
    // Movement form
    document.getElementById('movement-form').addEventListener('submit', handleMovementSubmit);
    
    // Modal close events
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// Load sample data for demonstration
function loadSampleData() {
    if (products.length === 0) {
        products = [
            { product_id: 'PROD001', name: 'Laptop Computer', description: 'High-performance business laptop' },
            { product_id: 'PROD002', name: 'Office Chair', description: 'Ergonomic office chair with lumbar support' },
            { product_id: 'PROD003', name: 'Monitor Display', description: '24-inch LED monitor' },
            { product_id: 'PROD004', name: 'Wireless Mouse', description: 'Bluetooth wireless mouse' }
        ];
    }
    
    if (locations.length === 0) {
        locations = [
            { location_id: 'LOC001', name: 'Main Warehouse', address: '123 Industrial St, City Center' },
            { location_id: 'LOC002', name: 'Store Front', address: '456 Main St, Downtown' },
            { location_id: 'LOC003', name: 'Secondary Storage', address: '789 Storage Ave, Industrial Zone' }
        ];
    }
    
    if (movements.length === 0) {
        movements = [
            {
                movement_id: 1,
                timestamp: new Date('2024-01-15T10:30:00'),
                product_id: 'PROD001',
                from_location: '',
                to_location: 'LOC001',
                qty: 50
            },
            {
                movement_id: 2,
                timestamp: new Date('2024-01-16T14:20:00'),
                product_id: 'PROD002',
                from_location: '',
                to_location: 'LOC001',
                qty: 25
            },
            {
                movement_id: 3,
                timestamp: new Date('2024-01-17T09:15:00'),
                product_id: 'PROD001',
                from_location: 'LOC001',
                to_location: 'LOC002',
                qty: 10
            }
        ];
    }
    
    saveDataToStorage();
}

// Update dashboard statistics
function updateDashboard() {
    document.getElementById('total-products').textContent = products.length;
    document.getElementById('total-locations').textContent = locations.length;
    document.getElementById('total-movements').textContent = movements.length;
    
    // Calculate total stock
    const totalStock = calculateTotalStock();
    document.getElementById('total-stock').textContent = totalStock;
    
    // Update recent activity
    updateRecentActivity();
}

// Calculate total stock across all locations
function calculateTotalStock() {
    const stockMap = {};
    
    movements.forEach(movement => {
        const productId = movement.product_id;
        
        if (!stockMap[productId]) {
            stockMap[productId] = 0;
        }
        
        // Add to stock if moving to a location
        if (movement.to_location) {
            stockMap[productId] += movement.qty;
        }
        
        // Subtract from stock if moving from a location
        if (movement.from_location) {
            stockMap[productId] -= movement.qty;
        }
    });
    
    return Object.values(stockMap).reduce((total, qty) => total + Math.max(qty, 0), 0);
}

// Update recent activity display
function updateRecentActivity() {
    const activityContainer = document.getElementById('recent-activity');
    const recentMovements = movements
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    if (recentMovements.length === 0) {
        activityContainer.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
        return;
    }
    
    activityContainer.innerHTML = recentMovements.map(movement => {
        const product = products.find(p => p.product_id === movement.product_id);
        const fromLocation = locations.find(l => l.location_id === movement.from_location);
        const toLocation = locations.find(l => l.location_id === movement.to_location);
        
        let description = `${product ? product.name : movement.product_id}`;
        
        if (movement.from_location && movement.to_location) {
            description += ` moved from ${fromLocation ? fromLocation.name : movement.from_location} to ${toLocation ? toLocation.name : movement.to_location}`;
        } else if (movement.to_location) {
            description += ` added to ${toLocation ? toLocation.name : movement.to_location}`;
        } else if (movement.from_location) {
            description += ` removed from ${fromLocation ? fromLocation.name : movement.from_location}`;
        }
        
        description += ` (Qty: ${movement.qty})`;
        
        return `
            <div class="activity-item">
                <div class="time">${formatDateTime(movement.timestamp)}</div>
                <div class="description">${description}</div>
            </div>
        `;
    }).join('');
}

// Product Management Functions
function refreshProductsTable() {
    const tbody = document.getElementById('products-table');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No products found. Click "Add Product" to get started.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.product_id}</td>
            <td>${product.name}</td>
            <td>${product.description || '-'}</td>
            <td class="table-actions">
                <button class="btn btn-warning btn-small" onclick="editProduct('${product.product_id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteProduct('${product.product_id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddProductModal() {
    currentEditId = null;
    currentEditType = 'product';
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').disabled = false;
    document.getElementById('product-modal').classList.add('show');
}

function editProduct(productId) {
    const product = products.find(p => p.product_id === productId);
    if (!product) return;
    
    currentEditId = productId;
    currentEditType = 'product';
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = product.product_id;
    document.getElementById('product-id').disabled = true;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-modal').classList.add('show');
}

function deleteProduct(productId) {
    showConfirmModal(
        `Are you sure you want to delete product "${productId}"? This action cannot be undone.`,
        () => {
            products = products.filter(p => p.product_id !== productId);
            saveDataToStorage();
            refreshProductsTable();
            updateDashboard();
            showMessage('Product deleted successfully!', 'success');
        }
    );
}

function handleProductSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = {
        product_id: formData.get('product_id'),
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    if (currentEditId) {
        // Update existing product
        const index = products.findIndex(p => p.product_id === currentEditId);
        if (index !== -1) {
            products[index] = { ...products[index], ...productData };
            showMessage('Product updated successfully!', 'success');
        }
    } else {
        // Check if product ID already exists
        if (products.find(p => p.product_id === productData.product_id)) {
            showMessage('Product ID already exists!', 'error');
            return;
        }
        
        // Add new product
        products.push(productData);
        showMessage('Product added successfully!', 'success');
    }
    
    saveDataToStorage();
    closeProductModal();
    refreshProductsTable();
    updateDashboard();
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('show');
    currentEditId = null;
    currentEditType = null;
}

// Location Management Functions
function refreshLocationsTable() {
    const tbody = document.getElementById('locations-table');
    
    if (locations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No locations found. Click "Add Location" to get started.</td></tr>';
        return;
    }
    
    tbody.innerHTML = locations.map(location => `
        <tr>
            <td>${location.location_id}</td>
            <td>${location.name}</td>
            <td>${location.address || '-'}</td>
            <td class="table-actions">
                <button class="btn btn-warning btn-small" onclick="editLocation('${location.location_id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteLocation('${location.location_id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddLocationModal() {
    currentEditId = null;
    currentEditType = 'location';
    document.getElementById('location-modal-title').textContent = 'Add Location';
    document.getElementById('location-form').reset();
    document.getElementById('location-id').disabled = false;
    document.getElementById('location-modal').classList.add('show');
}

function editLocation(locationId) {
    const location = locations.find(l => l.location_id === locationId);
    if (!location) return;
    
    currentEditId = locationId;
    currentEditType = 'location';
    document.getElementById('location-modal-title').textContent = 'Edit Location';
    document.getElementById('location-id').value = location.location_id;
    document.getElementById('location-id').disabled = true;
    document.getElementById('location-name').value = location.name;
    document.getElementById('location-address').value = location.address || '';
    document.getElementById('location-modal').classList.add('show');
}

function deleteLocation(locationId) {
    // Check if location is used in movements
    const hasMovements = movements.some(m => m.from_location === locationId || m.to_location === locationId);
    
    if (hasMovements) {
        showMessage('Cannot delete location that has movement history!', 'error');
        return;
    }
    
    showConfirmModal(
        `Are you sure you want to delete location "${locationId}"? This action cannot be undone.`,
        () => {
            locations = locations.filter(l => l.location_id !== locationId);
            saveDataToStorage();
            refreshLocationsTable();
            updateDashboard();
            showMessage('Location deleted successfully!', 'success');
        }
    );
}

function handleLocationSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const locationData = {
        location_id: formData.get('location_id'),
        name: formData.get('name'),
        address: formData.get('address')
    };
    
    if (currentEditId) {
        // Update existing location
        const index = locations.findIndex(l => l.location_id === currentEditId);
        if (index !== -1) {
            locations[index] = { ...locations[index], ...locationData };
            showMessage('Location updated successfully!', 'success');
        }
    } else {
        // Check if location ID already exists
        if (locations.find(l => l.location_id === locationData.location_id)) {
            showMessage('Location ID already exists!', 'error');
            return;
        }
        
        // Add new location
        locations.push(locationData);
        showMessage('Location added successfully!', 'success');
    }
    
    saveDataToStorage();
    closeLocationModal();
    refreshLocationsTable();
    updateDashboard();
}

function closeLocationModal() {
    document.getElementById('location-modal').classList.remove('show');
    currentEditId = null;
    currentEditType = null;
}

// Movement Management Functions
function refreshMovementsTable() {
    const tbody = document.getElementById('movements-table');
    
    if (movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No movements found. Click "Add Movement" to get started.</td></tr>';
        return;
    }
    
    const sortedMovements = movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tbody.innerHTML = sortedMovements.map(movement => {
        const product = products.find(p => p.product_id === movement.product_id);
        const fromLocation = locations.find(l => l.location_id === movement.from_location);
        const toLocation = locations.find(l => l.location_id === movement.to_location);
        
        return `
            <tr>
                <td>${movement.movement_id}</td>
                <td>${formatDateTime(movement.timestamp)}</td>
                <td>${product ? product.name : movement.product_id}</td>
                <td>${fromLocation ? fromLocation.name : (movement.from_location || '-')}</td>
                <td>${toLocation ? toLocation.name : (movement.to_location || '-')}</td>
                <td>${movement.qty}</td>
                <td class="table-actions">
                    <button class="btn btn-danger btn-small" onclick="deleteMovement(${movement.movement_id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function populateMovementDropdowns() {
    const productSelect = document.getElementById('movement-product');
    const fromSelect = document.getElementById('movement-from');
    const toSelect = document.getElementById('movement-to');
    
    // Populate products
    productSelect.innerHTML = '<option value="">Select Product</option>' +
        products.map(product => `<option value="${product.product_id}">${product.name}</option>`).join('');
    
    // Populate locations
    const locationOptions = locations.map(location => `<option value="${location.location_id}">${location.name}</option>`).join('');
    fromSelect.innerHTML = '<option value="">Select Location (Optional)</option>' + locationOptions;
    toSelect.innerHTML = '<option value="">Select Location (Optional)</option>' + locationOptions;
}

function showAddMovementModal() {
    currentEditId = null;
    currentEditType = 'movement';
    document.getElementById('movement-modal-title').textContent = 'Add Movement';
    document.getElementById('movement-form').reset();
    populateMovementDropdowns();
    document.getElementById('movement-modal').classList.add('show');
}

function deleteMovement(movementId) {
    showConfirmModal(
        'Are you sure you want to delete this movement? This action cannot be undone.',
        () => {
            movements = movements.filter(m => m.movement_id !== movementId);
            saveDataToStorage();
            refreshMovementsTable();
            updateDashboard();
            generateReport();
            showMessage('Movement deleted successfully!', 'success');
        }
    );
}

function handleMovementSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const movementData = {
        movement_id: Date.now(), // Simple ID generation
        timestamp: new Date(),
        product_id: formData.get('product_id'),
        from_location: formData.get('from_location') || '',
        to_location: formData.get('to_location') || '',
        qty: parseInt(formData.get('qty'))
    };
    
    // Validation
    if (!movementData.from_location && !movementData.to_location) {
        showMessage('Please select at least one location (from or to)!', 'error');
        return;
    }
    
    if (movementData.from_location === movementData.to_location && movementData.from_location) {
        showMessage('From and To locations cannot be the same!', 'error');
        return;
    }
    
    // Add new movement
    movements.push(movementData);
    
    saveDataToStorage();
    closeMovementModal();
    refreshMovementsTable();
    updateDashboard();
    generateReport();
    showMessage('Movement added successfully!', 'success');
}

function closeMovementModal() {
    document.getElementById('movement-modal').classList.remove('show');
    currentEditId = null;
    currentEditType = null;
}

// Report Generation
function generateReport() {
    const tbody = document.getElementById('reports-table');
    const stockMap = {};
    
    // Calculate current stock for each product-location combination
    movements.forEach(movement => {
        const key = `${movement.product_id}|${movement.to_location || 'OUT'}`;
        const fromKey = `${movement.product_id}|${movement.from_location || 'IN'}`;
        
        if (movement.to_location) {
            if (!stockMap[key]) stockMap[key] = 0;
            stockMap[key] += movement.qty;
        }
        
        if (movement.from_location) {
            if (!stockMap[fromKey]) stockMap[fromKey] = 0;
            stockMap[fromKey] -= movement.qty;
        }
    });
    
    // Convert to array and filter positive quantities
    const reportData = Object.entries(stockMap)
        .filter(([key, qty]) => qty > 0 && !key.includes('|OUT') && !key.includes('|IN'))
        .map(([key, qty]) => {
            const [productId, locationId] = key.split('|');
            const product = products.find(p => p.product_id === productId);
            const location = locations.find(l => l.location_id === locationId);
            
            return {
                product: product ? product.name : productId,
                location: location ? location.name : locationId,
                quantity: qty
            };
        })
        .sort((a, b) => a.product.localeCompare(b.product));
    
    if (reportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No inventory data available. Add some movements to see the report.</td></tr>';
        return;
    }
    
    tbody.innerHTML = reportData.map(item => `
        <tr>
            <td>${item.product}</td>
            <td>${item.location}</td>
            <td>${item.quantity}</td>
        </tr>
    `).join('');
}

// Utility Functions
function showConfirmModal(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-action-btn').onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
    document.getElementById('confirm-modal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('show');
}

function showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageEl, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
}

function formatDateTime(date) {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

// Data persistence functions
function saveDataToStorage() {
    localStorage.setItem('inventoryProducts', JSON.stringify(products));
    localStorage.setItem('inventoryLocations', JSON.stringify(locations));
    localStorage.setItem('inventoryMovements', JSON.stringify(movements));
}

function loadDataFromStorage() {
    const savedProducts = localStorage.getItem('inventoryProducts');
    const savedLocations = localStorage.getItem('inventoryLocations');
    const savedMovements = localStorage.getItem('inventoryMovements');
    
    if (savedProducts) products = JSON.parse(savedProducts);
    if (savedLocations) locations = JSON.parse(savedLocations);
    if (savedMovements) {
        movements = JSON.parse(savedMovements).map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
        }));
    }
}