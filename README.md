# Online Store

Примитивный интернет-магазин на Node.js и vanilla JavaScript.

## Запуск

```bash
npm start
```

Откройте http://localhost:3000.

## API

- `GET /api/products` — список товаров из `data/products.json`.
- `POST /api/products` — добавление нового товара в `data/products.json`.

Тело запроса для создания товара:

Корзина хранится локально в браузере через `localStorage` и восстанавливается после перезагрузки страницы.

Новые товары сохраняюся в файле products.json в разделе `data`.