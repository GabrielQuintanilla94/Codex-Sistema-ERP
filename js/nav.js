(function configurarNavegacion() {
    const nav = document.querySelector('.navegacion-lateral');
    if (!nav) return;
    const actual = (location.pathname.split('/').pop() || 'index.html').toLowerCase().replace('matriz_depreciacion.html','depreciacion.html');
    // Inicio fase 1: íconos de línea (SVG estático, sin datos externos)
    const iconos = {
        inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
        operaciones: '<path d="M4 7h15l-4-4"/><path d="M20 17H5l4 4"/>',
        inventario: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5"/><path d="M12 12v9"/>',
        activos: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
        reportes: '<path d="M3 20h18"/><path d="M6 20v-8"/><path d="M11 20V5"/><path d="M16 20v-5"/>',
        partida: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>',
        catalogo: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'
    };
    // Fin fase 1
    const enlaces = [
        ['index.html','Inicio','inicio'],
        ['operaciones.html','Operaciones','operaciones'],
        ['inventario.html','Inventario','inventario'],
        ['depreciacion.html','Activos fijos','activos'],
        ['reportes.html','Reportes','reportes'],
        ['partida_manual.html?accion=nueva-partida','Nueva partida','partida'],
        ['catalogo_cuentas.html','Catálogo','catalogo']
    ];
    nav.innerHTML = enlaces.map(function(e) {
        const activo = actual === e[0].split('?')[0];
        return `<a href="${e[0]}" class="${activo ? 'activo' : ''}"${activo ? ' aria-current="page"' : ''} title="${e[1]}"><span class="icono-nav"><svg viewBox="0 0 24 24" aria-hidden="true">${iconos[e[2]]}</svg></span><span>${e[1]}</span></a>`;
    }).join('');
})();
