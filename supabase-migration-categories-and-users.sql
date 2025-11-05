-- Smart Receipts: Add Categories and User Tracking
-- Run this in your Supabase SQL Editor

-- Add category and user tracking columns to uploaded_receipts
ALTER TABLE uploaded_receipts
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized',
    ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT,
    ADD COLUMN IF NOT EXISTS uploaded_by_email TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_uploaded_receipts_category
    ON uploaded_receipts(user_id, category);

-- Create index for date range filtering
CREATE INDEX IF NOT EXISTS idx_uploaded_receipts_date
    ON uploaded_receipts(user_id, upload_timestamp);

-- Create categories reference table (predefined categories)
CREATE TABLE IF NOT EXISTS receipt_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT DEFAULT 'receipt',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO receipt_categories (name, description, color, icon, display_order)
VALUES
    ('Meals & Entertainment', 'Restaurant, coffee, team meals', '#EF4444', 'utensils', 1),
    ('Travel', 'Flights, hotels, transportation', '#3B82F6', 'plane', 2),
    ('Office Supplies', 'Stationery, equipment, furniture', '#10B981', 'package', 3),
    ('Software & Services', 'Subscriptions, tools, licenses', '#8B5CF6', 'laptop', 4),
    ('Marketing', 'Advertising, promotional materials', '#F59E0B', 'megaphone', 5),
    ('Professional Services', 'Consulting, legal, accounting', '#06B6D4', 'briefcase', 6),
    ('Equipment', 'Hardware, machinery, tools', '#EC4899', 'wrench', 7),
    ('Utilities', 'Internet, phone, electricity', '#6366F1', 'zap', 8),
    ('Other', 'Miscellaneous expenses', '#6B7280', 'tag', 9),
    ('Uncategorized', 'Not yet categorized', '#9CA3AF', 'help-circle', 10)
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT ALL ON receipt_categories TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE receipt_categories_id_seq TO postgres, anon, authenticated, service_role;

-- Optional: Enable Row Level Security
-- ALTER TABLE receipt_categories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Categories are readable by everyone" ON receipt_categories FOR SELECT USING (true);
