async function cargarCatalogoTerceros() {
    let existentes = await obtenerTercerosBD();
    if (existentes.length) return existentes.sort(function(a, b) { return a.razonSocial.localeCompare(b.razonSocial); });
    const respuesta = await fetch("datos/terceros.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar el catálogo de terceros.");
    const terceros = await respuesta.json();
    await guardarTercerosBD(terceros);
    existentes = await obtenerTercerosBD();
    return existentes.sort(function(a, b) { return a.razonSocial.localeCompare(b.razonSocial); });
}
function buscarTerceroPorNRC(terceros, nrc) {
    return (terceros || []).find(function(item) { return String(item.nrc) === String(nrc); }) || null;
}
