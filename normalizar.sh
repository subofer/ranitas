#!/usr/bin/env bash
set -e

echo "== Ranitas normalizacion: inicio =="

backup_dir=".backup_normalizacion_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

# backup helper
bk() { [ -f "$1" ] && mkdir -p "$backup_dir/$(dirname "$1")" && cp -a "$1" "$backup_dir/$1" || true; }

# package.json
echo "-- Actualizando package.json"
bk package.json
if command -v jq >/dev/null 2>&1 && [ -f package.json ]; then
  tmp_pkg=$(mktemp)
  jq '.scripts = {
    "dev":"next dev",
    "build":"prisma generate && next build",
    "start":"next start",
    "lint":"next lint",
    "db:up":"docker compose up -d postgres",
    "db:down":"docker compose down",
    "db:psql":"docker exec -it $(docker ps -qf name=postgres) psql -U postgres",
    "prisma:gen":"prisma generate",
    "prisma:migrate":"prisma migrate dev",
    "prisma:deploy":"prisma migrate deploy",
    "seed":"node scripts/seed.js",
    "cypress:open":"cypress open",
    "cypress:run":"cypress run"
  }' package.json > "$tmp_pkg"
  mv "$tmp_pkg" package.json
else
  cat > package.json <<'EOF'
{
  "name": "proyecto",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "db:up": "docker compose up -d postgres",
    "db:down": "docker compose down",
    "db:psql": "docker exec -it $(docker ps -qf name=postgres) psql -U postgres",
    "prisma:gen": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "seed": "node scripts/seed.js",
    "cypress:open": "cypress open",
    "cypress:run": "cypress run"
  },
  "dependencies": {
    "@prisma/client": "^5.9.1"
  }
}
EOF
fi

# next.config.js
echo "-- next.config.js"
bk next.config.js
cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '4mb' } }
};
module.exports = nextConfig;
EOF

# tailwind.config.js
echo "-- tailwind.config.js"
bk tailwind.config.js
cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,tsx,mdx}",
    "./components/**/*.{js,jsx,tsx,mdx}",
    "./pages/**/*.{js,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-to-r': 'linear-gradient(to right, #6ee7b7 0%, #6ee7b7 50%, #3b82f6 50%, #3b82f6 100%)'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(0)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        spin: { from: { transform: 'rotate(360deg)' }, to: { transform: 'rotate(0deg)' } }
      },
      animation: { 'fade-in': 'fadeIn 0.3s ease-out forwards', 'spin-slow': 'spin 3s linear infinite' }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
EOF

# docker-compose.yml
echo "-- docker-compose.yml"
bk docker-compose.yml
cat > docker-compose.yml <<'EOF'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: las_ranitas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - dbdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d las_ranitas"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  dbdata:
EOF

# .dockerignore
echo "-- .dockerignore"
bk .dockerignore
cat > .dockerignore <<'EOF'
node_modules
.next
.git
coverage
cypress
.env*
EOF

# app/(paginas)/layout.js -> "use server"
echo "-- layout.js"
layout_path="app/(paginas)/layout.js"
if [ -f "$layout_path" ]; then
  bk "$layout_path"
  first=$(head -n1 "$layout_path" || true)
  if [ "$first" != '"use server";' ]; then printf '"use server";\n%s' "$(cat "$layout_path")" > "$layout_path.tmp" && mv "$layout_path.tmp" "$layout_path"; fi
else
  mkdir -p "app/(paginas)"
  cat > "$layout_path" <<'EOF'
"use server";
export default async function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
EOF
fi

# prisma/schema.prisma -> quitar seed=
echo "-- prisma/schema.prisma"
schema_path="prisma/schema.prisma"
if [ -f "$schema_path" ]; then
  bk "$schema_path"
  sed -i 's/^\s*seed\s*=.*$//g' "$schema_path"
else
  mkdir -p prisma
  cat > "$schema_path" <<'EOF'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
EOF
fi

# app/(paginas)/page.jsx -> comentar import DolarHoyServer si existe
echo "-- page.jsx import"
page_path="app/(paginas)/page.jsx"
if [ -f "$page_path" ]; then
  bk "$page_path"
  sed -i 's|^\s*import\s\+DolarHoyServer\s\+from\s\+["'\'']\.\./components/dolarHoy/DolarHoyServer["'\''];|// &|' "$page_path" || true
fi

echo "== Ranitas normalizacion: OK =="
echo "Backup en: $backup_dir"
