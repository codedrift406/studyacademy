## Supabase Setup

This backend now uses Supabase Postgres as the only active database.
The default app schema is `cognify`.

### Which connection strings to use

Use the stable Supabase session pooler setup:

- `DATABASE_URL`: session pooler on port `5432`
- `DIRECT_URL`: session pooler on port `5432`

### Where to find them

1. Open your Supabase project.
2. Click `Connect`.
3. Copy the `Session pooler` connection string and use port `5432`.

### Fill `.env`

Update:

```env
DATABASE_URL="postgresql://postgres.project-ref:password@aws-1-region.pooler.supabase.com:5432/postgres?sslmode=require&schema=cognify"
DIRECT_URL="postgresql://postgres.project-ref:password@aws-1-region.pooler.supabase.com:5432/postgres?sslmode=require&schema=cognify"
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
