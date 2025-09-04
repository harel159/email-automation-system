// server/seed.js
import { query } from './db/index.js';

async function ensureSchema() {
  // ---------- authorities ----------
  await query(`
    CREATE TABLE IF NOT EXISTS authorities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`ALTER TABLE authorities ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;`);
  await query(`ALTER TABLE authorities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authorities_email_key') THEN
      ALTER TABLE authorities ADD CONSTRAINT authorities_email_key UNIQUE (email);
    END IF;
  END $$;`);

  // ---------- email_templates ----------
  await query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS title TEXT;`);
  await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS subject TEXT;`);
  await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_html TEXT;`);
  await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await query(`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await query(`UPDATE email_templates SET title = COALESCE(title, 'Untitled') WHERE title IS NULL;`);
  await query(`UPDATE email_templates SET subject = COALESCE(subject, 'Subject') WHERE subject IS NULL;`);
  await query(`UPDATE email_templates SET body_html = COALESCE(body_html, '<p>Empty</p>') WHERE body_html IS NULL;`);
  await query(`ALTER TABLE email_templates ALTER COLUMN title SET NOT NULL;`);
  await query(`ALTER TABLE email_templates ALTER COLUMN subject SET NOT NULL;`);
  await query(`ALTER TABLE email_templates ALTER COLUMN body_html SET NOT NULL;`);

  // ---------- attachments ----------
  await query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      template_id INT NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS template_id INT;`);
  await query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_name TEXT;`);
  await query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_url TEXT;`);
  await query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attachments_template_id_fkey') THEN
      ALTER TABLE attachments
        ADD CONSTRAINT attachments_template_id_fkey
        FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE CASCADE;
    END IF;
  END $$;`);
  await query(`ALTER TABLE attachments ALTER COLUMN file_name SET NOT NULL;`);
  await query(`ALTER TABLE attachments ALTER COLUMN file_url SET NOT NULL;`);
  await query(`ALTER TABLE attachments ALTER COLUMN template_id SET NOT NULL;`);
  // ---------- email_logs (for sent/failed tracking) ----------
  await query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id SERIAL PRIMARY KEY,
      authority_id INT REFERENCES authorities(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      template_id INT REFERENCES email_templates(id) ON DELETE SET NULL,
      status TEXT CHECK (status IN ('sent','failed')) NOT NULL,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ---------- customers (NEW) ----------
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT;`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  // ensure unique(email)
  await query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_email_key') THEN
      ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email);
    END IF;
  END $$;`);
  // enforce not-null on required columns
  await query(`UPDATE customers SET name = COALESCE(name, 'Unnamed') WHERE name IS NULL;`);
  await query(`UPDATE customers SET email = COALESCE(email, 'placeholder@example.com') WHERE email IS NULL;`);
  await query(`ALTER TABLE customers ALTER COLUMN name SET NOT NULL;`);
  await query(`ALTER TABLE customers ALTER COLUMN email SET NOT NULL;`);
}

async function seed() {
  try {
    console.log('🚀 Seeding local PostgreSQL demo data...');

    await ensureSchema();

    // clear (child -> parent)
    await query('DELETE FROM attachments');
    await query('DELETE FROM email_templates');
    await query('DELETE FROM authorities');
    await query('DELETE FROM customers');

    // authorities
    const authorities = [
      ['City of Alpha', 'alpha@example.com'],
      ['City of Beta',  'beta@example.com'],
      ['City of Gamma', 'gamma@example.com'],
    ];
    for (const [name, email] of authorities) {
      await query(
        'INSERT INTO authorities (name, email, active) VALUES ($1, $2, true)',
        [name, email]
      );
    }
    console.log('✅ Inserted 3 authorities');

    // email template
    const tpl = await query(
      `INSERT INTO email_templates (title, subject, body_html)
       VALUES ($1, $2, $3) RETURNING id`,
      [
        'Monthly Status Update',
        'Status Update – {{month}}',
        `<p>Hello {{name}},</p>
         <p>This is a <strong>demo</strong> email for interview purposes.</p>
         <p>Best regards,<br/>Demo System</p>`
      ]
    );
    const templateId = tpl.rows[0].id;

    // attachments (paths must exist in /server/attachments)
    const files = [
      ['power_of_attorney_alpha.pdf', '/attachments/alpha.pdf'],
      ['power_of_attorney_beta.pdf',  '/attachments/beta.pdf'],
    ];
    for (const [fileName, fileUrl] of files) {
      await query(
        `INSERT INTO attachments (template_id, file_name, file_url)
         VALUES ($1, $2, $3)`,
        [templateId, fileName, fileUrl]
      );
    }

    // customers (NEW demo rows)
    const customers = [
      ['Acme Ltd', 'harel.jerbi1@gmail.com', '050-1234567', 'VIP customer'],
      ['John Doe', 'john.doe@example.com', null,       'Individual customer'],
    ];
    for (const [name, email, phone, notes] of customers) {
      await query(
        `INSERT INTO customers (name, email, phone, notes, active)
         VALUES ($1, $2, $3, $4, true)`,
        [name, email, phone, notes]
      );
    }
    console.log('✅ Inserted 2 customers');

    console.log('🎉 Local DB seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

seed();
