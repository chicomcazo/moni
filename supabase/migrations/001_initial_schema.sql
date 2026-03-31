-- Categories: normalized item categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Receipts: one per photo/nota fiscal
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT NOT NULL,
  telegram_message_id BIGINT,
  store_name TEXT,
  receipt_date DATE,
  total_amount DECIMAL(10,2),
  items_total DECIMAL(10,2),
  image_url TEXT,
  raw_ocr_text TEXT,
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items: individual line items from receipts
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  raw_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Category mappings: cache of raw_name -> category
CREATE TABLE category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name_pattern TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES categories(id),
  normalized_name TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  usage_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_receipts_chat_id ON receipts(telegram_chat_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_items_receipt_id ON items(receipt_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_category_mappings_pattern ON category_mappings(raw_name_pattern);
