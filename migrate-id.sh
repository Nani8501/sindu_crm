#!/bin/bash

DB_USER="root"
DB_PASS="Qwerty8501"
DB_NAME="sindhu_crm_db"

echo "Starting database migration..."
echo

# Helper function to run SQL
run_sql() {
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$1" 2>&1 | grep -v "Warning"
}

# Step 1: Drop ALL FKs that reference users table
echo "Step 1: Dropping ALL foreign keys that reference users..."
run_sql "ALTER TABLE course_enrollments DROP FOREIGN KEY course_enrollments_ibfk_24;"
run_sql "ALTER TABLE course_enrollments DROP FOREIGN KEY course_enrollments_ibfk_32;"
run_sql "ALTER TABLE sessions DROP FOREIGN KEY sessions_ibfk_24;"
run_sql "ALTER TABLE sessions DROP FOREIGN KEY sessions_ibfk_32;"
run_sql "ALTER TABLE submissions DROP FOREIGN KEY submissions_ibfk_32;"
run_sql "ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_1;"
run_sql "ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_2;"
run_sql "ALTER TABLE courses DROP FOREIGN KEY courses_ibfk_1;"
echo "✓ All foreign keys dropped"

# Step 2: Modify columns
echo
echo "Step 2: Modifying ID columns to VARCHAR(30)..."
run_sql "ALTER TABLE users MODIFY COLUMN id VARCHAR(30) NOT NULL;"
run_sql "ALTER TABLE courses MODIFY COLUMN professor_id VARCHAR(30);"
run_sql "ALTER TABLE sessions MODIFY COLUMN professor_id VARCHAR(30);"
run_sql "ALTER TABLE messages MODIFY COLUMN sender_id VARCHAR(30);"
run_sql "ALTER TABLE messages MODIFY COLUMN receiver_id VARCHAR(30);"
run_sql "ALTER TABLE course_enrollments MODIFY COLUMN student_id VARCHAR(30);"
run_sql "ALTER TABLE submissions MODIFY COLUMN student_id VARCHAR(30);"
echo "✓ Columns modified"

# Step 3: Recreate FKs
echo
echo "Step 3: Recreating foreign keys..."
run_sql "ALTER TABLE courses ADD CONSTRAINT courses_ibfk_1 FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;"
run_sql "ALTER TABLE sessions ADD CONSTRAINT sessions_ibfk_24 FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;"
run_sql "ALTER TABLE messages ADD CONSTRAINT messages_ibfk_1 FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;"
run_sql "ALTER TABLE messages ADD CONSTRAINT messages_ibfk_2 FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;"
run_sql "ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_ibfk_24 FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;"
run_sql "ALTER TABLE submissions ADD CONSTRAINT submissions_ibfk_32 FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;"
echo "✓ Foreign keys recreated"

echo
echo "✅ Migration completed successfully!"
