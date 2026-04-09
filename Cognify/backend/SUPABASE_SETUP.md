## Supabase Setup

This backend now uses Supabase Postgres as the only active database.
The default app schema is `cognify`.

### Which connection strings to use

Use the stable Supabase session pooler setup:

- `DATABASE_URL`: session pooler on port `5432`
- `DIRECT_URL`: session pooler on port `5432`
- `sslrootcert`: Supabase Root 2021 CA saved in `prisma/supabase-root-2021-ca.pem`

### Where to find them

1. Open your Supabase project.
2. Click `Connect`.
3. Copy the `Session pooler` connection string and use port `5432`.
4. Download the `Supabase Root 2021 CA` certificate and save it as `prisma/supabase-root-2021-ca.pem`.

### Fill `.env.local` or `.env`

Update:

```env
DATABASE_URL="postgresql://postgres.project-ref:password@aws-1-region.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=./prisma/supabase-root-2021-ca.pem&schema=cognify"
DIRECT_URL="postgresql://postgres.project-ref:password@aws-1-region.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=./prisma/supabase-root-2021-ca.pem&schema=cognify"
```

### After that

Run:

```bash
npm run prisma:generate
npx prisma db push
```

### Important

The previous local SQLite data has already been migrated out of the active workspace database.
Because this project now uses a dedicated schema, Prisma should no longer conflict with tables in `public` such as Supabase auth-related objects.
If `prisma generate` fails on Windows with `EPERM ... query_engine-windows.dll.node`, stop any running backend `node` processes and rerun the command.
If Prisma still throws `P1001`, verify that the CA file exists at `prisma/supabase-root-2021-ca.pem`.
