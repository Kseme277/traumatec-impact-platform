-- Champs financiers / participants Projects.xlsx (BI dashboard)

ALTER TABLE events.events
    ADD COLUMN IF NOT EXISTS cost_center VARCHAR(255),
    ADD COLUMN IF NOT EXISTS participants_expected INTEGER,
    ADD COLUMN IF NOT EXISTS participants_real INTEGER,
    ADD COLUMN IF NOT EXISTS amount_chf NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS payments_done_chf NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS percent_paid NUMERIC(8, 4),
    ADD COLUMN IF NOT EXISTS balance_to_pay_chf NUMERIC(14, 2);
