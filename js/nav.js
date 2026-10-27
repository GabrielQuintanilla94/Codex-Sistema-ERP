(function configurarNavegacion() {
    const nav = document.querySelector('.navegacion-lateral');
    if (!nav) return;
    const actual = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const enlaces = [
        ['index.html','Inicio','⌂'],
        ['operaciones.html','Operaciones','⇄'],
        ['inventario.html','Inventario','◇'],
        ['depreciacion.html','Activos fijos','≋'],
        ['reportes.html','Reportes','▥'],
        ['partida_manual.html?accion=nueva-partida','Nueva partida','＋'],
        ['catalogo_cuentas.html','Catálogo','≡']
    ];
    nav.innerHTML = enlaces.map(function(e) {
        return `<a href="${e[0]}" class="${actual === e[0].split('?')[0] ? 'activo' : ''}" title="${e[1]}"><span class="icono-nav icono-nav-texto">${e[2]}</span><span>${e[1]}</span></a>`;
    }).join('');
})();
