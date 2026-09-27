const productsElement = document.querySelector('#products');
const statusElement = document.querySelector('#product-status');
const cartCountElement = document.querySelector('#cart-count');
const cartItemsElement = document.querySelector('#cart-items');
const cartTotalElement = document.querySelector('#cart-total');
const productForm = document.querySelector('#product-form');
const productFormStatus = document.querySelector('#product-form-status');
const cartStorageKey = 'online-store-cart';
let products = [];
let cart = loadCart();

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(price);
}

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartStorageKey));
    return Array.isArray(savedCart) ? savedCart : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

function renderCart() {
  const cartProducts = cart
    .map((cartItem) => ({ ...cartItem, product: products.find((product) => product.id === cartItem.id) }))
    .filter((cartItem) => cartItem.product);
  const cartCount = cartProducts.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartProducts.reduce((total, item) => total + item.product.price * item.quantity, 0);

  cartCountElement.textContent = cartCount;
  cartTotalElement.textContent = formatPrice(cartTotal);
  cartItemsElement.innerHTML = cartProducts.length
    ? cartProducts.map(({ product, quantity }) => `
      <div class="cart-item">
        <span>${product.name} × ${quantity}</span>
        <div>
          <strong>${formatPrice(product.price * quantity)}</strong>
          <button type="button" class="remove-button" data-remove-id="${product.id}">Удалить</button>
        </div>
      </div>
    `).join('')
    : '<p class="empty-cart">Корзина пока пуста.</p>';
}

function addToCart(productId) {
  const cartItem = cart.find((item) => item.id === productId);
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  saveCart();
  renderCart();
}

function renderProducts(products) {
  productsElement.innerHTML = products.map((product) => `
    <article class="product-card">
      <span class="product-category">${product.category}</span>
      <h3>${product.name}</h3>
      <div class="product-footer">
        <strong>${formatPrice(product.price)}</strong>
        <button type="button" data-product-id="${product.id}">В корзину</button>
      </div>
    </article>
  `).join('');

  productsElement.onclick = (event) => {
    if (!event.target.matches('button[data-product-id]')) return;
    addToCart(Number(event.target.dataset.productId));
    event.target.textContent = 'Добавлено';
  };
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Не удалось загрузить каталог');
    products = await response.json();
    renderProducts(products);
    statusElement.textContent = `${products.length} товара`;
    renderCart();
  } catch (error) {
    statusElement.textContent = error.message;
  }
}

cartItemsElement.onclick = (event) => {
  if (!event.target.matches('[data-remove-id]')) return;
  const productId = Number(event.target.dataset.removeId);
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
};

productForm.onsubmit = async (event) => {
  event.preventDefault();
  const formData = new FormData(productForm);
  const productData = Object.fromEntries(formData.entries());
  productFormStatus.textContent = 'Сохранение...';

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Не удалось сохранить товар');

    productForm.reset();
    productFormStatus.textContent = 'Товар добавлен';
    await loadProducts();
  } catch (error) {
    productFormStatus.textContent = error.message;
  }
};

loadProducts();