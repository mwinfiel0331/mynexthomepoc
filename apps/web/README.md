# Next.js

## Getting started

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher

### Install

```bash
pnpm i
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Production

```bash
pnpm start
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (root layout and pages)
│   │   ├── compare/page.tsx    (home comparison page)
│   │   ├── shortlist/page.tsx  (shortlist page)
│   │   └── api/
│   │       ├── search/route.ts      (POST /api/search)
│   │       ├── score/route.ts       (POST /api/score)
│   │       └── shortlist/
│   │           ├── route.ts         (GET/POST /api/shortlist)
│   │           └── [id]/route.ts    (DELETE /api/shortlist/:id)
│   └── globals.css (global styles)
├── public/           (static files)
├── prisma/
│   └── schema.prisma (database schema)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Styling

This project uses Tailwind CSS. The configuration is in `tailwind.config.js`.

### Global styles

Global styles are defined in `src/app/globals.css`.

### Component styling

Use Tailwind CSS classes directly in components. For example:

```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>
```

## Environment Variables

See `.env.example` for required environment variables. Create a `.env.local` file with your values.

```bash
cp .env.example .env.local
```

## Database

This project uses Prisma with SQLite for development and PostgreSQL for production.

### Run migrations

```bash
pnpm db:push
```

### Seed the database (optional)

```bash
pnpm db:seed
```

## Testing

### Run tests

```bash
pnpm test
```

### Watch mode

```bash
pnpm test -- --watch
```

### Coverage

```bash
pnpm test -- --coverage
```

## Linting and Formatting

### Lint

```bash
pnpm lint
```

### Format

```bash
pnpm format
```

## Deployment

See [docs/05-deployment.md](../../docs/05-deployment.md) for deployment instructions.
