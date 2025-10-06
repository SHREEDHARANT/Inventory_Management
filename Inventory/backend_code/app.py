# Flask Backend for Inventory Management System
# Save this as app.py

from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "inventory.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)

# Database Models
class Product(db.Model):
    __tablename__ = 'products'
    
    product_id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Relationship with movements
    movements = db.relationship('ProductMovement', backref='product', lazy=True)
    
    def to_dict(self):
        return {
            'product_id': self.product_id,
            'name': self.name,
            'description': self.description
        }

class Location(db.Model):
    __tablename__ = 'locations'
    
    location_id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text)
    
    # Relationships with movements
    from_movements = db.relationship('ProductMovement', foreign_keys='ProductMovement.from_location', backref='from_loc', lazy=True)
    to_movements = db.relationship('ProductMovement', foreign_keys='ProductMovement.to_location', backref='to_loc', lazy=True)
    
    def to_dict(self):
        return {
            'location_id': self.location_id,
            'name': self.name,
            'address': self.address
        }

class ProductMovement(db.Model):
    __tablename__ = 'product_movements'
    
    movement_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    product_id = db.Column(db.String(50), db.ForeignKey('products.product_id'), nullable=False)
    from_location = db.Column(db.String(50), db.ForeignKey('locations.location_id'), nullable=True)
    to_location = db.Column(db.String(50), db.ForeignKey('locations.location_id'), nullable=True)
    qty = db.Column(db.Integer, nullable=False)
    
    def to_dict(self):
        return {
            'movement_id': self.movement_id,
            'timestamp': self.timestamp.isoformat(),
            'product_id': self.product_id,
            'from_location': self.from_location,
            'to_location': self.to_location,
            'qty': self.qty
        }

# API Routes

# Product Management
@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([product.to_dict() for product in products])

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.json
    
    # Check if product already exists
    if Product.query.get(data['product_id']):
        return jsonify({'error': 'Product ID already exists'}), 400
    
    product = Product(
        product_id=data['product_id'],
        name=data['name'],
        description=data.get('description', '')
    )
    
    try:
        db.session.add(product)
        db.session.commit()
        return jsonify(product.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.json
    
    product.name = data.get('name', product.name)
    product.description = data.get('description', product.description)
    
    try:
        db.session.commit()
        return jsonify(product.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    # Check if product has movements
    if ProductMovement.query.filter_by(product_id=product_id).first():
        return jsonify({'error': 'Cannot delete product with movement history'}), 400
    
    try:
        db.session.delete(product)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Location Management
@app.route('/api/locations', methods=['GET'])
def get_locations():
    locations = Location.query.all()
    return jsonify([location.to_dict() for location in locations])

@app.route('/api/locations', methods=['POST'])
def create_location():
    data = request.json
    
    # Check if location already exists
    if Location.query.get(data['location_id']):
        return jsonify({'error': 'Location ID already exists'}), 400
    
    location = Location(
        location_id=data['location_id'],
        name=data['name'],
        address=data.get('address', '')
    )
    
    try:
        db.session.add(location)
        db.session.commit()
        return jsonify(location.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/<location_id>', methods=['PUT'])
def update_location(location_id):
    location = Location.query.get_or_404(location_id)
    data = request.json
    
    location.name = data.get('name', location.name)
    location.address = data.get('address', location.address)
    
    try:
        db.session.commit()
        return jsonify(location.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/<location_id>', methods=['DELETE'])
def delete_location(location_id):
    location = Location.query.get_or_404(location_id)
    
    # Check if location has movements
    has_movements = (ProductMovement.query.filter_by(from_location=location_id).first() or 
                    ProductMovement.query.filter_by(to_location=location_id).first())
    
    if has_movements:
        return jsonify({'error': 'Cannot delete location with movement history'}), 400
    
    try:
        db.session.delete(location)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Movement Management
@app.route('/api/movements', methods=['GET'])
def get_movements():
    movements = ProductMovement.query.order_by(ProductMovement.timestamp.desc()).all()
    return jsonify([movement.to_dict() for movement in movements])

@app.route('/api/movements', methods=['POST'])
def create_movement():
    data = request.json
    
    # Validate that product exists
    if not Product.query.get(data['product_id']):
        return jsonify({'error': 'Product not found'}), 400
    
    # Validate locations if provided
    if data.get('from_location') and not Location.query.get(data['from_location']):
        return jsonify({'error': 'From location not found'}), 400
    
    if data.get('to_location') and not Location.query.get(data['to_location']):
        return jsonify({'error': 'To location not found'}), 400
    
    # Validate that at least one location is provided
    if not data.get('from_location') and not data.get('to_location'):
        return jsonify({'error': 'At least one location (from or to) must be specified'}), 400
    
    # Validate that from and to locations are different
    if (data.get('from_location') and data.get('to_location') and 
        data['from_location'] == data['to_location']):
        return jsonify({'error': 'From and to locations cannot be the same'}), 400
    
    movement = ProductMovement(
        product_id=data['product_id'],
        from_location=data.get('from_location'),
        to_location=data.get('to_location'),
        qty=data['qty'],
        timestamp=datetime.utcnow()
    )
    
    try:
        db.session.add(movement)
        db.session.commit()
        return jsonify(movement.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/movements/<int:movement_id>', methods=['DELETE'])
def delete_movement(movement_id):
    movement = ProductMovement.query.get_or_404(movement_id)
    
    try:
        db.session.delete(movement)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Reports
@app.route('/api/reports/inventory', methods=['GET'])
def get_inventory_report():
    # Get all movements and calculate current stock
    movements = ProductMovement.query.all()
    stock_data = {}
    
    for movement in movements:
        # Initialize product dict if not exists
        if movement.product_id not in stock_data:
            stock_data[movement.product_id] = {}
        
        # Add stock to destination location
        if movement.to_location:
            if movement.to_location not in stock_data[movement.product_id]:
                stock_data[movement.product_id][movement.to_location] = 0
            stock_data[movement.product_id][movement.to_location] += movement.qty
        
        # Remove stock from source location
        if movement.from_location:
            if movement.from_location not in stock_data[movement.product_id]:
                stock_data[movement.product_id][movement.from_location] = 0
            stock_data[movement.product_id][movement.from_location] -= movement.qty
    
    # Format report data
    report_data = []
    for product_id, locations in stock_data.items():
        product = Product.query.get(product_id)
        for location_id, qty in locations.items():
            if qty > 0:  # Only show positive quantities
                location = Location.query.get(location_id)
                report_data.append({
                    'product': product.name if product else product_id,
                    'product_id': product_id,
                    'location': location.name if location else location_id,
                    'location_id': location_id,
                    'quantity': qty
                })
    
    return jsonify(sorted(report_data, key=lambda x: (x['product'], x['location'])))

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    total_products = Product.query.count()
    total_locations = Location.query.count()
    total_movements = ProductMovement.query.count()
    
    # Calculate total stock
    report_data = get_inventory_report().get_json()
    total_stock = sum(item['quantity'] for item in report_data)
    
    return jsonify({
        'total_products': total_products,
        'total_locations': total_locations,
        'total_movements': total_movements,
        'total_stock': total_stock
    })

# Initialize database
@app.before_first_request
def create_tables():
    db.create_all()
    
    # Add sample data if tables are empty
    if Product.query.count() == 0:
        sample_products = [
            Product(product_id='PROD001', name='Laptop Computer', description='High-performance business laptop'),
            Product(product_id='PROD002', name='Office Chair', description='Ergonomic office chair with lumbar support'),
            Product(product_id='PROD003', name='Monitor Display', description='24-inch LED monitor'),
            Product(product_id='PROD004', name='Wireless Mouse', description='Bluetooth wireless mouse')
        ]
        
        sample_locations = [
            Location(location_id='LOC001', name='Main Warehouse', address='123 Industrial St, City Center'),
            Location(location_id='LOC002', name='Store Front', address='456 Main St, Downtown'),
            Location(location_id='LOC003', name='Secondary Storage', address='789 Storage Ave, Industrial Zone')
        ]
        
        for product in sample_products:
            db.session.add(product)
        
        for location in sample_locations:
            db.session.add(location)
        
        db.session.commit()
        
        # Add sample movements
        sample_movements = [
            ProductMovement(product_id='PROD001', to_location='LOC001', qty=50),
            ProductMovement(product_id='PROD002', to_location='LOC001', qty=25),
            ProductMovement(product_id='PROD001', from_location='LOC001', to_location='LOC002', qty=10),
            ProductMovement(product_id='PROD003', to_location='LOC002', qty=15),
            ProductMovement(product_id='PROD004', to_location='LOC001', qty=100)
        ]
        
        for movement in sample_movements:
            db.session.add(movement)
        
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)