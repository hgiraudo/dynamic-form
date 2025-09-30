#!/usr/bin/env node

// Script helper para leer configuración desde config.general.js
// y exportarla en formato que bash pueda usar

import config from './config.general.js';

// Exportar variables en formato bash
console.log(`FRONTEND_PORT=${config.ports.frontend}`);
console.log(`BACKEND_PORT=${config.ports.backend}`);
console.log(`SERVER_HOST=${config.server.host}`);