# 🏪 Sistema de Gestión - Las Ranitas

Sistema completo de gestión de productos e inventario desarrollado con **Next.js 15**, **React 19**, **Prisma 5.9** y **PostgreSQL**.

## 🚀 Características Principales

### 📦 Gestión de Productos Avanzada
- ✅ Códigos de barras únicos con validación
- ✅ Sistema jerárquico de presentaciones (unidad → caja → pallet)
- ✅ Categorización múltiple
- ✅ Gestión de proveedores por producto
- ✅ Historial de precios
- ✅ Upload de imágenes

### 👥 Gestión de Contactos
- ✅ Proveedores y clientes
- ✅ Validación automática de CUIT
- ✅ Búsqueda online de CUIT en AFIP
- ✅ Georreferenciación completa (provincias, localidades, calles)
- ✅ Emails y cuentas bancarias

### 💰 Sistema de Ventas y Compras
- ✅ Facturas y remitos automáticos
- ✅ Cálculos de totales con impuestos
- ✅ Control de stock en tiempo real
- ✅ Historial completo de transacciones

### 🔍 Funcionalidades Avanzadas
- ✅ Búsqueda de productos en Google por código de barras
- ✅ Lectura de códigos QR/códigos de barras con cámara
- ✅ Exportación a Excel
- ✅ Consultas a IA (Ollama/local)
- ✅ Cotización del dólar automática
- ✅ Dashboard con gráficos

## 🛠️ Tecnologías

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Base de Datos**: PostgreSQL con Prisma 5.9 ORM
- **Autenticación**: JWT con scrypt hashing
- **Testing**: Cypress (E2E), Jest (Unit)
- **UI/UX**: FontAwesome icons, SweetAlert2, Toast notifications
- **Integraciones**: Puppeteer, Cheerio, Ollama (local)

## 📋 Prerrequisitos

- Node.js 18+
- PostgreSQL 13+
- Docker (opcional, para base de datos)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd ranitas
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar base de datos
```bash
# Con Docker
npm run db:up

# O configurar PostgreSQL manualmente
createdb las_ranitas
```

### 4. Configurar variables de entorno
```bash
cp configEnv .env.local
# Editar .env.local con tus configuraciones
```

> 🔧 Nota: Si trabajaste con el servicio de visión localmente, puedes limpiar artefactos Python (entornos `.venv`, `__pycache__`, `*.pyc`, `*.log`) con:
>
> ```bash
> ./scripts/cleanup-python-artifacts.sh --dry-run
> ./scripts/cleanup-python-artifacts.sh
> ```
> El script opera sólo dentro de `services/` y no borra los modelos en `services/yolo/models/`.

### 5. Ejecutar migraciones
```bash
npm run prisma:migrate
npm run prisma:gen
```

### 6. Poblar base de datos
```bash
npm run seed
```

### 7. Ejecutar aplicación
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🧪 Testing

### Ejecutar tests end-to-end
```bash
# Modo interactivo
npm run cypress:open

# Modo headless
npm run cypress:run
```

### Ejecutar tests unitarios
```bash
npm test
```

### Credenciales de prueba
- **Usuario**: `subofer`
- **Contraseña**: `1234`

## 📁 Estructura del Proyecto

```
ranitas/
├── app/                          # Next.js App Router
│   ├── (paginas)/               # Páginas públicas
│   ├── (public)/                # Páginas de autenticación
│   ├── components/              # Componentes reutilizables
│   ├── hooks/                   # Custom hooks
│   ├── ia/                      # Integración con IA
│   └── layout.jsx               # Layout root
├── prisma/                       # Base de datos
│   ├── schema.prisma            # Esquema de BD
│   ├── migrations/              # Migraciones
│   ├── consultas/               # Consultas de BD
│   └── serverActions/           # Server Actions
├── cypress/                      # Tests E2E
│   ├── e2e/                     # Tests
│   ├── fixtures/                # Datos de prueba
│   └── support/                 # Utilidades de testing
└── lib/                         # Utilidades
```

## 🎯 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm start                # Servidor de producción

# Base de datos
npm run db:up            # Iniciar PostgreSQL con Docker
npm run db:down          # Detener PostgreSQL
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:gen       # Generar cliente Prisma
npm run seed             # Poblar base de datos

# Testing
npm run cypress:open     # Tests E2E interactivos
npm run cypress:run      # Tests E2E headless
npm test                 # Tests unitarios

# Utilidades
npm run lint             # Linting
```

## 🔒 Autenticación

El sistema utiliza autenticación JWT con:
- Hashing seguro con scrypt
- Middleware de protección de rutas
- Sesiones HTTP-only
- Roles de usuario (admin, usuario)

## 📊 Base de Datos

### Modelo Principal
- **Productos**: Gestión completa con presentaciones jerárquicas
- **Categorías**: Sistema de etiquetado múltiple
- **Contactos**: Proveedores y clientes con datos completos
- **Documentos**: Facturas, remitos y órdenes de compra
- **Precios**: Historial de precios por producto
- **Usuarios**: Sistema de autenticación

### Georreferenciación
- Provincias, localidades y calles argentinas
- Integración con datos del gobierno
- Normalización automática de direcciones

## 🚀 Despliegue

### Producción
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t las-ranitas .
docker run -p 3000:3000 las-ranitas
```

### Vercel
```bash
npm install -g vercel
vercel --prod
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- 📧 Email: soporte@lasranitas.com
- 📱 WhatsApp: +54 9 11 1234-5678
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/las-ranitas/issues)

---

**Desarrollado con ❤️ por el equipo de Las Ranitas**
