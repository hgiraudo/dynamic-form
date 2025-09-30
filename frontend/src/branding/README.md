# Configuración de Marca Corporativa

Esta carpeta centraliza todos los elementos de branding de la aplicación para facilitar el cambio de marca.

## Archivos

### `brandConfig.js`
Configuración principal de marca en JavaScript. Define:
- **Nombre de la empresa**: `brandConfig.name`
- **Colores corporativos**: `brandConfig.colors` (primary, secondary, etc.)
- **Rutas de logos**: `brandConfig.logos` (white, color)
- **Fuentes** (opcional): `brandConfig.fonts`

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
<div className="bg-allaria-blue text-white">...</div>
<button className="hover:bg-allaria-light-blue">Click</button>
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
  --color-allaria-blue: #YourNewColor;
  --color-allaria-light-blue: #YourNewColor;
}
```

También actualizar `brandConfig.js`:
```javascript
colors: {
  primary: "#YourNewColor",
  secondary: "#YourNewColor",
}
```

### 3. Cambiar los Logos
1. Reemplazar los archivos en `frontend/public/img/`:
   - `allaria-logo-blanco.svg` → Logo para fondos oscuros
   - `allaria-logo-color.svg` → Logo para fondos claros

   O agregar nuevos archivos y actualizar las rutas en `brandConfig.js`:
   ```javascript
   logos: {
     white: "/img/tu-logo-blanco.svg",
     color: "/img/tu-logo-color.svg",
   }
   ```

## Notas Importantes

- **No se incluyen**: Espaciado, márgenes, padding, layout, etc. Estos quedan en los componentes.
- **Solo marca corporativa**: Colores, fuentes y logos que identifican la empresa.
- Los colores deben cambiarse en **ambos archivos** (CSS y JS) para mantener consistencia.
