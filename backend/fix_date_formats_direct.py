# fix_date_formats_direct.py
import sqlite3
import os

# Path to your SQLite database
db_path = 'instance/bandapp.db'  # Adjust this path to match your actual database location backend/instance/bandapp.db

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # First, get all rehearsals to view the current format
    cursor.execute("SELECT id, date FROM rehearsals")
    rehearsals = cursor.fetchall()
    
    print(f"Found {len(rehearsals)} rehearsals")
    for r_id, date in rehearsals:
        print(f"Rehearsal {r_id}: date = {date}")
    
    # Modify the storage class of the date column to TEXT (temporarily)
    cursor.execute("CREATE TABLE rehearsals_temp AS SELECT id, date, created_at, time, location, recurring_pattern_id FROM rehearsals")
    cursor.execute("DROP TABLE rehearsals")
    cursor.execute("""
    CREATE TABLE rehearsals (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        time TIME,
        location TEXT,
        recurring_pattern_id INTEGER REFERENCES recurring_patterns(id)
    )
    """)
    
    # Copy data, converting date formats
    cursor.execute("SELECT id, date, created_at, time, location, recurring_pattern_id FROM rehearsals_temp")
    rows = cursor.fetchall()
    
    for row in rows:
        r_id, date_str, created_at, time, location, pattern_id = row
        
        # Extract just the YYYY-MM-DD part from the date string
        if date_str and ' ' in date_str:
            date_str = date_str.split(' ')[0]
        
        # Insert with cleaned date format
        cursor.execute(
            "INSERT INTO rehearsals (id, date, created_at, time, location, recurring_pattern_id) VALUES (?, ?, ?, ?, ?, ?)",
            (r_id, date_str, created_at, time, location, pattern_id)
        )
    
    # Drop the temporary table
    cursor.execute("DROP TABLE rehearsals_temp")
    
    # Update the responses foreign key constraints to match the new rehearsals table
    cursor.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("CREATE TABLE responses_temp AS SELECT * FROM responses")
    cursor.execute("DROP TABLE responses")
    
    # Recreate responses table with proper foreign key constraints
    cursor.execute("""
    CREATE TABLE responses (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        rehearsal_id INTEGER NOT NULL REFERENCES rehearsals(id),
        attending BOOLEAN DEFAULT 1,
        comment TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, rehearsal_id)
    )
    """)
    
    # Copy data back
    cursor.execute("INSERT INTO responses SELECT * FROM responses_temp")
    cursor.execute("DROP TABLE responses_temp")
    cursor.execute("PRAGMA foreign_keys = ON")
    
    # Verify the date format is correct now
    cursor.execute("SELECT id, date FROM rehearsals")
    fixed_rehearsals = cursor.fetchall()
    print("\nAfter fixing:")
    for r_id, date in fixed_rehearsals:
        print(f"Rehearsal {r_id}: date = {date}")
    
    # Commit all changes
    conn.commit()
    print("\nDate formats fixed successfully!")

except Exception as e:
    conn.rollback()
    print(f"Error fixing date formats: {str(e)}")
finally:
    conn.close()