"use strict";

const numeroWhatsApp = "50243231151";
const CART_KEY = "daria_cart_v2";
const qs = selector => document.querySelector(selector);
const qsa = selector => [...document.querySelectorAll(selector)];

const productsGrid = qs("#products-grid");
const searchInput = qs("#search-input");
const clearSearchButton = qs("#clear-search");
const resultsMessage = qs("#results-message");
const productsTitle = qs("#products-title");
const filterButtons = qsa(".filter-button");
const productModal = qs("#product-modal");
const modalImage = qs("#modal-product-image");
const modalBadge = qs("#modal-product-badge");
const modalCategory = qs("#modal-product-category");
const modalName = qs("#modal-product-name");
const modalDescription = qs("#modal-product-description");
const modalPrice = qs("#modal-product-price");
const modalPreference = qs("#modal-preference");
const modalAddCart = qs("#modal-add-cart");
const modalWhatsAppButton = qs("#modal-whatsapp-button");
const cartDrawer = qs("#cart-drawer");
const cartItems = qs("#cart-items");
const cartTotal = qs("#cart-total");
const cartCount = qs("#cart-count");
const floatingCartCount = qs("#floating-cart-count");
const orderNotes = qs("#order-notes");
const toast = qs("#toast");
const backToTop = qs("#back-to-top");

let todosLosProductos = [];
let filtroActivo = "Todos";
let productoModalActivo = null;
let ultimoElementoEnfocado = null;
let carrito = cargarCarrito();

function normalizar(texto = "") {
  return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatearPrecio(valor) {
  return `Q${Number(valor || 0).toFixed(2)}`;
}

function escaparHTML(texto = "") {
  return String(texto).replace(/[&<>'"]/g, caracter => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[caracter]));
}

function construirWhatsApp(mensaje) {
  return `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
}

function manejarImagenRota(imagen) {
  imagen.classList.add("broken-image");
  imagen.alt = "Imagen no disponible";
}

async function cargarProductos() {
  try {
    const respuesta = await fetch("data/productos.json", { cache: "no-store" });
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const datos = await respuesta.json();
    if (!Array.isArray(datos)) throw new Error("El archivo de productos no contiene una lista válida.");
    todosLosProductos = datos;
    actualizarCantidadCategorias();
    aplicarFiltros();
    configurarEnlacesWhatsApp();
    renderizarCarrito();
  } catch (error) {
    console.error("No se pudieron cargar los productos:", error);
    productsGrid.innerHTML = '<p class="error-message">No pudimos cargar el catálogo. Abre la carpeta con Live Server y vuelve a intentarlo.</p>';
  }
}

function productosFiltrados() {
  const busqueda = normalizar(searchInput.value);
  return todosLosProductos.filter(producto => {
    const disponible = producto.disponible !== false;
    const coincideCategoria = filtroActivo === "Todos" || producto.categoria === filtroActivo;
    const texto = normalizar(`${producto.nombre} ${producto.categoria} ${producto.descripcion} ${producto.etiqueta || ""}`);
    return disponible && coincideCategoria && (!busqueda || texto.includes(busqueda));
  });
}

function aplicarFiltros() {
  const productos = productosFiltrados();
  mostrarProductos(productos);
  const busqueda = searchInput.value.trim();
  productsTitle.textContent = filtroActivo === "Todos" ? "Nuestros productos" : filtroActivo;
  resultsMessage.textContent = `${productos.length} producto${productos.length === 1 ? "" : "s"}${busqueda ? ` para “${busqueda}”` : ""}.`;
  clearSearchButton.hidden = !busqueda;
}

function mostrarProductos(productos) {
  if (!productos.length) {
    productsGrid.innerHTML = '<p class="empty-message">No encontramos productos con esos filtros. Prueba con otra palabra o categoría.</p>';
    return;
  }

  productsGrid.innerHTML = productos.map(producto => `
    <article class="product-card">
      <button class="product-image-button" type="button" data-view-product="${producto.id}" aria-label="Ver ${escaparHTML(producto.nombre)}">
        <div class="product-image">
          ${producto.etiqueta ? `<span class="product-badge">${escaparHTML(producto.etiqueta)}</span>` : ""}
          <img src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}" loading="lazy" decoding="async">
        </div>
      </button>
      <div class="product-info">
        <span class="product-category">${escaparHTML(producto.categoria)}</span>
        <h3>${escaparHTML(producto.nombre)}</h3>
        <p class="product-description">${escaparHTML(producto.descripcion)}</p>
        <div class="product-footer">
          <span class="product-price">${formatearPrecio(producto.precio)}</span>
          <div class="product-actions">
            <button class="product-button secondary-small" type="button" data-view-product="${producto.id}">Ver</button>
            <button class="product-button primary-small" type="button" data-add-product="${producto.id}">Agregar</button>
          </div>
        </div>
      </div>
    </article>
  `).join("");

  qsa("#products-grid img").forEach(imagen => imagen.addEventListener("error", () => manejarImagenRota(imagen), { once: true }));
}

function seleccionarFiltro(categoria) {
  filtroActivo = categoria;
  filterButtons.forEach(boton => boton.classList.toggle("active", boton.dataset.filter === categoria));
}

function actualizarCantidadCategorias() {
  qsa("[data-count-category]").forEach(elemento => {
    const categoria = elemento.dataset.countCategory;
    const cantidad = todosLosProductos.filter(producto => producto.categoria === categoria && producto.disponible !== false).length;
    elemento.textContent = `${cantidad} producto${cantidad === 1 ? "" : "s"}`;
  });
}

function abrirModal(producto) {
  ultimoElementoEnfocado = document.activeElement;
  productoModalActivo = producto;
  modalImage.src = producto.imagen;
  modalImage.alt = producto.nombre;
  modalBadge.textContent = producto.etiqueta || "";
  modalCategory.textContent = producto.categoria;
  modalName.textContent = producto.nombre;
  modalDescription.textContent = producto.descripcion;
  modalPrice.textContent = formatearPrecio(producto.precio);
  modalPreference.value = "";
  modalWhatsAppButton.href = construirWhatsApp(`Hola, quisiera información sobre ${producto.nombre} (${formatearPrecio(producto.precio)}).`);
  productModal.classList.add("open");
  productModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  qs(".modal-close").focus();
}

function cerrarModal() {
  productModal.classList.remove("open");
  productModal.setAttribute("aria-hidden", "true");
  if (!cartDrawer.classList.contains("open")) document.body.classList.remove("no-scroll");
  if (ultimoElementoEnfocado) ultimoElementoEnfocado.focus();
}

function cargarCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarCarrito() {
  localStorage.setItem(CART_KEY, JSON.stringify(carrito));
  actualizarContadoresCarrito();
}

function agregarAlCarrito(producto, preferencia = "") {
  const pref = preferencia.trim();
  const existente = carrito.find(item => item.id === producto.id && item.preferencia === pref);
  if (existente) existente.cantidad += 1;
  else carrito.push({ id: producto.id, nombre: producto.nombre, precio: Number(producto.precio), imagen: producto.imagen, cantidad: 1, preferencia: pref });
  guardarCarrito();
  renderizarCarrito();
  mostrarToast(`${producto.nombre} agregado al carrito`);
}

function actualizarContadoresCarrito() {
  const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
  cartCount.textContent = cantidad;
  floatingCartCount.textContent = cantidad;
}

function renderizarCarrito() {
  actualizarContadoresCarrito();
  if (!carrito.length) {
    cartItems.innerHTML = '<div class="empty-cart"><span>🛍️</span><h3>Tu carrito está vacío</h3><p>Agrega los productos que te gusten y envía el pedido por WhatsApp.</p></div>';
    cartTotal.textContent = "Q0.00";
    return;
  }

  cartItems.innerHTML = carrito.map((item, index) => `
    <article class="cart-item">
      <img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.nombre)}">
      <div class="cart-item-info">
        <h3>${escaparHTML(item.nombre)}</h3>
        <span>${formatearPrecio(item.precio)}</span>
        ${item.preferencia ? `<p>Detalle: ${escaparHTML(item.preferencia)}</p>` : '<p>Color/modelo por confirmar</p>'}
        <div class="quantity-controls">
          <button type="button" data-cart-action="decrease" data-index="${index}" aria-label="Disminuir cantidad">−</button>
          <strong>${item.cantidad}</strong>
          <button type="button" data-cart-action="increase" data-index="${index}" aria-label="Aumentar cantidad">+</button>
          <button class="remove-item" type="button" data-cart-action="remove" data-index="${index}">Eliminar</button>
        </div>
      </div>
    </article>
  `).join("");

  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  cartTotal.textContent = formatearPrecio(total);
}

function abrirCarrito() {
  ultimoElementoEnfocado = document.activeElement;
  renderizarCarrito();
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  qs(".cart-close").focus();
}

function cerrarCarrito() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  if (!productModal.classList.contains("open")) document.body.classList.remove("no-scroll");
  if (ultimoElementoEnfocado) ultimoElementoEnfocado.focus();
}

function mensajePedido() {
  const lineas = carrito.map(item => {
    const subtotal = formatearPrecio(item.precio * item.cantidad);
    const detalle = item.preferencia || "color/modelo por confirmar";
    return `• ${item.cantidad} × ${item.nombre} — ${subtotal}\n  Detalle: ${detalle}`;
  });
  const total = formatearPrecio(carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0));
  const notas = orderNotes.value.trim();
  return `Hola, deseo realizar este pedido en Daria:\n\n${lineas.join("\n\n")}\n\nTotal de productos: ${total}${notas ? `\n\nNotas: ${notas}` : ""}\n\n¿Podrían confirmarme disponibilidad, colores/modelos y entrega?`;
}

function configurarEnlacesWhatsApp() {
  qsa(".whatsapp-link").forEach(enlace => {
    enlace.href = construirWhatsApp(enlace.dataset.message || "Hola, quisiera información sobre el catálogo de Daria.");
    enlace.target = "_blank";
    enlace.rel = "noopener";
  });
}

let toastTimer;
function mostrarToast(mensaje) {
  toast.textContent = mensaje;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

searchInput.addEventListener("input", aplicarFiltros);
clearSearchButton.addEventListener("click", () => { searchInput.value = ""; aplicarFiltros(); searchInput.focus(); });
filterButtons.forEach(boton => boton.addEventListener("click", () => { seleccionarFiltro(boton.dataset.filter); aplicarFiltros(); }));
qsa(".category-link").forEach(enlace => enlace.addEventListener("click", () => { searchInput.value = ""; seleccionarFiltro(enlace.dataset.category); aplicarFiltros(); }));

productsGrid.addEventListener("click", event => {
  const ver = event.target.closest("[data-view-product]");
  const agregar = event.target.closest("[data-add-product]");
  if (ver) {
    const producto = todosLosProductos.find(item => item.id === Number(ver.dataset.viewProduct));
    if (producto) abrirModal(producto);
  }
  if (agregar) {
    const producto = todosLosProductos.find(item => item.id === Number(agregar.dataset.addProduct));
    if (producto) agregarAlCarrito(producto);
  }
});

modalImage.addEventListener("error", () => manejarImagenRota(modalImage));
modalAddCart.addEventListener("click", () => {
  if (!productoModalActivo) return;
  agregarAlCarrito(productoModalActivo, modalPreference.value);
  cerrarModal();
  abrirCarrito();
});
qsa("[data-close-modal]").forEach(elemento => elemento.addEventListener("click", cerrarModal));
qs("#open-cart-button").addEventListener("click", abrirCarrito);
qs("#floating-cart-button").addEventListener("click", abrirCarrito);
qsa("[data-close-cart]").forEach(elemento => elemento.addEventListener("click", cerrarCarrito));

cartItems.addEventListener("click", event => {
  const boton = event.target.closest("[data-cart-action]");
  if (!boton) return;
  const index = Number(boton.dataset.index);
  if (!carrito[index]) return;
  if (boton.dataset.cartAction === "increase") carrito[index].cantidad += 1;
  if (boton.dataset.cartAction === "decrease") carrito[index].cantidad -= 1;
  if (boton.dataset.cartAction === "remove" || carrito[index].cantidad <= 0) carrito.splice(index, 1);
  guardarCarrito();
  renderizarCarrito();
});

qs("#clear-cart-button").addEventListener("click", () => {
  if (!carrito.length) return;
  if (window.confirm("¿Deseas vaciar todo el carrito?")) {
    carrito = [];
    guardarCarrito();
    renderizarCarrito();
    mostrarToast("Carrito vaciado");
  }
});

qs("#send-whatsapp-order").addEventListener("click", () => {
  if (!carrito.length) {
    mostrarToast("Agrega al menos un producto antes de enviar el pedido");
    return;
  }
  window.open(construirWhatsApp(mensajePedido()), "_blank", "noopener");
});

backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
window.addEventListener("scroll", () => backToTop.classList.toggle("visible", window.scrollY > 650), { passive: true });

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (productModal.classList.contains("open")) cerrarModal();
    if (cartDrawer.classList.contains("open")) cerrarCarrito();
  }
});

qs("#current-year").textContent = new Date().getFullYear();
actualizarContadoresCarrito();
cargarProductos();
