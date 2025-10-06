# Database Setup Script for Inventory Management System
# Run this file to initialize the database: python database_setup.py

from app import app, db, Product, Location, ProductMovement
from datetime import datetime

def create_database():
    """Create all database tables"""
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

def add_sample_data():
    """Add sample data to the database"""
    with app.app_context():
        # Check if data already exists
        if Product.query.count() > 0:
            print("Sample data already exists!")
            return
        
        # Sample Products
        products = [
            Product(product_id='PROD001', name='Laptop Computer', description='High-performance business laptop'),
            Product(product_id='PROD002', name='Office Chair', description='Ergonomic office chair with lumbar support'),
            Product(product_id='PROD003', name='Monitor Display', description='24-inch LED monitor'),
            Product(product_id='PROD004', name='Wireless Mouse', description='Bluetooth wireless mouse'),
            Product(product_id='PROD005', name='Keyboard', description='Mechanical keyboard'),
            Product(product_id='PROD006', name='Desk Lamp', description='LED desk lamp with adjustable brightness')
        ]
        
        # Sample Locations
        locations = [
            Location(location_id='LOC001', name='Main Warehouse', address='123 Industrial St, City Center'),
            Location(location_id='LOC002', name='Store Front', address='456 Main St, Downtown'),
            Location(location_id='LOC003', name='Secondary Storage', address='789 Storage Ave, Industrial Zone'),
            Location(location_id='LOC004', name='Distribution Center', address='321 Logistics Blvd, Port Area')
        ]
        
        # Add products and locations
        for product in products:
            db.session.add(product)
        
        for location in locations:
            db.session.add(location)
        
        db.session.commit()
        
        # Sample Movements
        movements = [
            # Initial stock arrivals
            ProductMovement(product_id='PROD001', to_location='LOC001', qty=50),
            ProductMovement(product_id='PROD002', to_location='LOC001', qty=25),
            ProductMovement(product_id='PROD003', to_location='LOC001', qty=30),
            ProductMovement(product_id='PROD004', to_location='LOC001', qty=100),
            ProductMovement(product_id='PROD005', to_location='LOC001', qty=75),
            ProductMovement(product_id='PROD006', to_location='LOC001', qty=40),
            
            # Transfers to store front
            ProductMovement(product_id='PROD001', from_location='LOC001', to_location='LOC002', qty=10),
            ProductMovement(product_id='PROD002', from_location='LOC001', to_location='LOC002', qty=5),
            ProductMovement(product_id='PROD003', from_location='LOC001', to_location='LOC002', qty=8),
            ProductMovement(product_id='PROD004', from_location='LOC001', to_location='LOC002', qty=20),
            
            # Transfers to secondary storage
            ProductMovement(product_id='PROD001', from_location='LOC001', to_location='LOC003', qty=15),
            ProductMovement(product_id='PROD005', from_location='LOC001', to_location='LOC003', qty=25),
            ProductMovement(product_id='PROD006', from_location='LOC001', to_location='LOC003', qty=10),
            
            # Some sales/outbound movements
            ProductMovement(product_id='PROD001', from_location='LOC002', qty=3),
            ProductMovement(product_id='PROD003', from_location='LOC002', qty=2),
            ProductMovement(product_id='PROD004', from_location='LOC002', qty=5)
        ]
        
        for movement in movements:
            db.session.add(movement)
        
        db.session.commit()
        
        print("Sample data added successfully!")
        print(f"Added {len(products)} products, {len(locations)} locations, and {len(movements)} movements")

def reset_database():
    """Reset the database by dropping and recreating all tables"""
    with app.app_context():
        db.drop_all()
        print("Database tables dropped!")
        create_database()
        add_sample_data()

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'reset':
        reset_database()
    else:
        create_database()
        add_sample_data()
    
    print("Database setup complete!")