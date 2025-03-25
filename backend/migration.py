# migration.py
from app import app, db
from sqlalchemy import text
import time

with app.app_context():
    print("Starting migration...")
    
    # Step 1: Add is_super_admin column to users table
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT 0'))
            conn.commit()
            print("Added is_super_admin column to users table")
    except Exception as e:
        print(f"Error adding is_super_admin column: {e}")
        print("Column may already exist, continuing...")
    
    # Step 2: Create band table
    with db.engine.connect() as conn:
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS bands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                FOREIGN KEY(created_by) REFERENCES users(id)
            )
        '''))
        conn.commit()
        print("Created bands table")
    
    # Step 3: Create band_memberships table
    with db.engine.connect() as conn:
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS band_memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                band_id INTEGER NOT NULL,
                role VARCHAR(20) DEFAULT 'member',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(band_id) REFERENCES bands(id),
                UNIQUE(user_id, band_id)
            )
        '''))
        conn.commit()
        print("Created band_memberships table")
    
    # Step 4: Add band_id column to rehearsals table
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE rehearsals ADD COLUMN band_id INTEGER'))
            conn.commit()
            print("Added band_id column to rehearsals table")
    except Exception as e:
        print(f"Error adding band_id column: {e}")
        print("Column may already exist, continuing...")
    
    # Step 5: Create a default band and assign everything to it
    with db.engine.connect() as conn:
        # Get admin user
        admin_result = conn.execute(text('SELECT id FROM users WHERE is_admin = 1 LIMIT 1'))
        admin_id = admin_result.fetchone()[0]
        
        # Set the admin as super admin
        conn.execute(text('UPDATE users SET is_super_admin = 1 WHERE id = :admin_id'),
                     {'admin_id': admin_id})
        
        # Create default band
        conn.execute(text('''
            INSERT INTO bands (name, description, created_by)
            VALUES ('Default Band', 'Default band created during migration', :admin_id)
        '''), {'admin_id': admin_id})
        
        # Get the band ID
        band_result = conn.execute(text('SELECT id FROM bands ORDER BY id DESC LIMIT 1'))
        band_id = band_result.fetchone()[0]
        
        # Add all users to this band
        conn.execute(text('''
            INSERT INTO band_memberships (user_id, band_id, role)
            SELECT id, :band_id, CASE WHEN is_admin = 1 THEN 'admin' ELSE 'member' END
            FROM users
        '''), {'band_id': band_id})
        
        # Update all rehearsals to belong to this band
        conn.execute(text('UPDATE rehearsals SET band_id = :band_id'), 
                     {'band_id': band_id})
        
        conn.commit()
        print(f"Created default band with ID {band_id} and added all users and rehearsals to it")
    
    print("Migration completed successfully!")