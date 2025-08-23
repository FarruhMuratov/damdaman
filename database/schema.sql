-- === Extensions & housekeeping ===
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- для шифрования/хэширования при нужде

-- === Enumerations ===
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'guide', 'agent', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('not_verified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tour_status AS ENUM ('draft', 'pending_moderation', 'active', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'pending_payment','confirmed','cancelled_by_client','cancelled_by_partner','completed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending_moderation','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('payment','payout','refund','commission','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tx_status AS ENUM ('pending','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === Core tables ===
CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number     VARCHAR(20) NOT NULL UNIQUE,
    telegram_id      BIGINT UNIQUE,
    name             VARCHAR(255) NOT NULL,
    avatar_url       TEXT,
    role             user_role NOT NULL,
    password_hash    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- для guide/agent/admin обязателен пароль:
    CONSTRAINT users_pwd_required CHECK (
        (role IN ('guide','agent','admin') AND password_hash IS NOT NULL)
        OR (role='client')
    )
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Профиль партнёра (1:1 с users)
CREATE TABLE IF NOT EXISTS partner_profiles (
    user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name         VARCHAR(255),
    bio                  TEXT,
    average_rating       DECIMAL(3,2) NOT NULL DEFAULT 0,
    verification_status  verification_status NOT NULL DEFAULT 'not_verified',
    city                 VARCHAR(255)
);

-- Платёжные реквизиты партнёра (1:1 с users), чувствительные данные
CREATE TABLE IF NOT EXISTS partner_payout_details (
    user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    card_number_encrypted  TEXT NOT NULL,
    recipient_name         VARCHAR(255) NOT NULL,
    bank_name              VARCHAR(255),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Категории
CREATE TABLE IF NOT EXISTS categories (
    id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name  VARCHAR(255) NOT NULL UNIQUE
);

-- Туры
CREATE TABLE IF NOT EXISTS tours (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title              VARCHAR(255) NOT NULL,
    short_description  TEXT,
    description        TEXT,
    price_adult        DECIMAL(10,2) NOT NULL CHECK (price_adult >= 0),
    price_child        DECIMAL(10,2) CHECK (price_child >= 0),
    media_urls         TEXT[] NOT NULL DEFAULT '{}',
    category_id        UUID NOT NULL REFERENCES categories(id),
    partner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status             tour_status NOT NULL DEFAULT 'draft',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tours_partner_role CHECK (
        (SELECT role FROM users WHERE users.id = partner_id) IN ('guide','agent')
    )
);

CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(status) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_tours_category ON tours(category_id);
CREATE INDEX IF NOT EXISTS idx_tours_partner ON tours(partner_id);

-- Расписания туров (слоты)
CREATE TABLE IF NOT EXISTS tour_schedules (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id       UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    start_date    TIMESTAMPTZ NOT NULL,
    end_date      TIMESTAMPTZ NOT NULL,
    total_slots   INTEGER NOT NULL CHECK (total_slots > 0),
    booked_slots  INTEGER NOT NULL DEFAULT 0 CHECK (booked_slots >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT schedule_date_range CHECK (end_date > start_date),
    CONSTRAINT schedule_capacity CHECK (booked_slots <= total_slots)
);

CREATE INDEX IF NOT EXISTS idx_schedules_tour ON tour_schedules(tour_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start ON tour_schedules(start_date);

-- Бронирования
CREATE TABLE IF NOT EXISTS bookings (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id           UUID NOT NULL REFERENCES tour_schedules(id) ON DELETE RESTRICT,
    client_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    num_adults            INTEGER NOT NULL CHECK (num_adults > 0),
    num_children          INTEGER NOT NULL DEFAULT 0 CHECK (num_children >= 0),
    total_price           DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    status                booking_status NOT NULL DEFAULT 'pending_payment',
    client_contact_name   VARCHAR(255) NOT NULL,
    client_contact_phone  VARCHAR(20) NOT NULL,
    payment_url           TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Отзывы (1:1 с booking)
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    tour_id     UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    client_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    status      review_status NOT NULL DEFAULT 'pending_moderation',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_tour ON reviews(tour_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Транзакции
CREATE TABLE IF NOT EXISTS transactions (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id         UUID REFERENCES bookings(id) ON DELETE SET NULL,
    sender_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    amount             DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    type               tx_type NOT NULL,
    status             tx_status NOT NULL DEFAULT 'pending',
    payment_gateway_id TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tx_type_status ON transactions(type, status);

-- === Derivative: представление балансов партнёров (к выплате) ===
-- Логика: подтверждённые платежи клиентов минус комиссия платформы, по завершённым турам
-- Комиссию можно хранить как отдельные commission-транзакции.
CREATE OR REPLACE VIEW partner_balances AS
SELECT
    u.id AS partner_id,
    COALESCE(SUM(
      CASE WHEN t.type='payment' AND t.status='completed' THEN t.amount
           WHEN t.type='commission' AND t.status='completed' THEN -t.amount
           WHEN t.type='refund' AND t.status='completed' THEN -t.amount
           WHEN t.type='payout' AND t.status IN ('completed','pending') THEN -t.amount
           ELSE 0 END
    ),0)::DECIMAL(12,2) AS balance_to_payout
FROM users u
LEFT JOIN transactions t ON t.receiver_id = u.id OR t.sender_id = u.id
WHERE u.role IN ('guide','agent')
GROUP BY u.id;

-- === Триггер: обновление среднего рейтинга партнёра после модерации отзыва ===
CREATE OR REPLACE FUNCTION refresh_partner_avg_rating() RETURNS TRIGGER AS $$
BEGIN
  -- обновлять только при переходе в 'approved' или при изменении rating/статуса
  IF TG_OP IN ('INSERT','UPDATE','DELETE') THEN
    -- найдём партнёра по туру
    UPDATE partner_profiles pp
    SET average_rating = COALESCE((
        SELECT ROUND(AVG(r.rating)::numeric, 2)
        FROM reviews r
        JOIN tours t ON t.id = r.tour_id
        WHERE r.status='approved' AND t.partner_id = pp.user_id
    ),0)
    WHERE pp.user_id IN (
        SELECT t.partner_id FROM tours t
        WHERE t.id = COALESCE(NEW.tour_id, OLD.tour_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_partner_avg_rating ON reviews;
CREATE TRIGGER trg_refresh_partner_avg_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_partner_avg_rating();

-- === Функция бронирования (атомарное списание мест) ===
-- Используем SELECT ... FOR UPDATE для строгой блокировки строки слота.
CREATE OR REPLACE FUNCTION allocate_slots(_schedule_id UUID, _adults INT, _children INT)
RETURNS BOOLEAN AS $$
DECLARE
  need_slots INT := _adults + COALESCE(_children,0);
  cur_total INT;
  cur_booked INT;
BEGIN
  PERFORM 1 FROM tour_schedules WHERE id=_schedule_id FOR UPDATE; -- блокировка
  SELECT total_slots, booked_slots INTO cur_total, cur_booked FROM tour_schedules WHERE id=_schedule_id;

  IF cur_booked + need_slots > cur_total THEN
    RETURN FALSE;
  END IF;

  UPDATE tour_schedules
  SET booked_slots = booked_slots + need_slots,
      updated_at = NOW()
  WHERE id=_schedule_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- === Инициализация базовых данных ===

-- Добавляем базовые категории туров
INSERT INTO categories (name) VALUES 
    ('Пляжный отдых'),
    ('Горнолыжный спорт'),
    ('Экскурсионные туры'),
    ('Активный отдых'),
    ('Культурный туризм'),
    ('Экотуризм'),
    ('Гастрономические туры'),
    ('Свадебные туры')
ON CONFLICT (name) DO NOTHING;

-- Создаем тестового админа (пароль: admin123)
INSERT INTO users (phone_number, name, role, password_hash) VALUES 
    ('+998901234567', 'Администратор системы', 'admin', crypt('admin123', gen_salt('bf')))
ON CONFLICT (phone_number) DO NOTHING;

-- Создаем профиль для админа
INSERT INTO partner_profiles (user_id, company_name, verification_status, city) VALUES 
    ((SELECT id FROM users WHERE phone_number = '+998901234567'), 'Damdaman Tour Platform', 'verified', 'Ташкент')
ON CONFLICT (user_id) DO NOTHING;
