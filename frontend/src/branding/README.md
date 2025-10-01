# Configuración de Marca Corporativa

Esta carpeta centraliza todos los elementos de branding de la aplicación para facilitar el cambio de marca.

## Paleta de Colores (Ejemplo)
- **Color Principal**: `#122142` (brand-primary - Bunting)
- **Color Secundario**: `#0058cb` (brand-secondary - Science Blue)
- **Color de Acento**: `#0058cb` (brand-accent - Science Blue)
- **Gris Claro**: `#eff3fb` (Link Water)
- **Gris Oscuro**: `#122142` (Bunting)

### Tipografía
- **Fuente Principal**: Open Sans (Google Fonts)
- Pesos: 300, 400, 600, 700, 800

## Archivos

### `brandConfig.js`
Configuración principal de marca en JavaScript. Define:
- **Nombre de la empresa**: `brandConfig.name`
- **Colores corporativos**: `brandConfig.colors` (primary, secondary, accent, etc.)
- **Rutas de logos**: `brandConfig.logos` (white, color)
- **Fuentes**: `brandConfig.fonts`

**Uso en componentes:**
```jsx
import { brandConfig } from '../../branding/brandConfig';

<h1>{brandConfig.name}</h1>
<img src={brandConfig.logos.white} alt={`${brandConfig.name} Logo`} />
```

### `brandColors.css`
Colores corporativos como variables de tema de TailwindCSS.

**Uso en JSX:**
```jsx
<div className="bg-brand-primary text-white">...</div>
<button className="bg-brand-accent hover:opacity-90">Click</button>
<span className="text-brand-secondary">Texto</span>
```

## Cómo Cambiar la Marca

### 1. Cambiar el Nombre
Editar `brandConfig.js`:
```javascript
name: "NuevaMarca",
```

### 2. Cambiar los Colores
Editar `brandColors.css`:
```css
@theme {
  --color-brand-primary: #YourNewColor;
  --color-brand-secondary: #YourNewColor;
  --color-brand-accent: #YourNewColor;
}
```

También actualizar `brandConfig.js`:
```javascript
colors: {
  primary: "#YourNewColor",
  secondary: "#YourNewColor",
  accent: "#YourNewColor",
}
```

### 3. Cambiar los Logos
Reemplazar los archivos en `frontend/public/img/`:
- `logo-white.svg` → Logo para fondos oscuros (navbar)
- `logo-color.svg` → Logo para fondos claros (modales)
- `favicon.svg` → Ícono de la pestaña del navegador

O actualizar las rutas en `brandConfig.js`:
```javascript
logos: {
  white: "/img/logo-white.svg",
  color: "/img/logo-color.svg",
}
```

### 4. Cambiar la Fuente
1. Editar `frontend/index.html` para importar nueva fuente de Google Fonts
2. Actualizar `brandConfig.js`:
   ```javascript
   fonts: {
     primary: "'Tu Fuente', sans-serif",
   }
   ```
3. Actualizar `frontend/src/index.css`:
   ```css
   body {
     font-family: 'Tu Fuente', sans-serif;
   }
   ```

## Archivos Modificados

### Frontend
- `frontend/index.html` - Título, fuentes, favicon
- `frontend/src/index.css` - Fuente global
- `frontend/src/branding/brandConfig.js` - Configuración JS
- `frontend/src/branding/brandColors.css` - Colores Tailwind
- `frontend/public/img/logo-white.svg` - Logo blanco
- `frontend/public/img/logo-color.svg` - Logo color
- `frontend/public/img/favicon.svg` - Favicon

### Componentes que usan brandConfig
- `frontend/src/components/layout/Layout.jsx`
- `frontend/src/components/forms/WizardForm.jsx`

## Notas Importantes

- **No se incluyen**: Espaciado, márgenes, padding, layout, etc. Estos quedan en los componentes.
- **Solo marca corporativa**: Colores, fuentes y logos que identifican la empresa.
- Los colores deben cambiarse en **ambos archivos** (CSS y JS) para mantener consistencia.
- Los componentes usan clases Tailwind con los colores definidos (`bg-brand-primary`, etc.)
