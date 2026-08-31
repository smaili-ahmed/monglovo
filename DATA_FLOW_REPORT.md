# 📄 تقرير معماري: مسار البيانات وآلية عمل مشروع Monglovo

---

## 1. 🏗️ نظرة عامة على المشروع (Project Architecture)

مشروع **Monglovo** هو تطبيق Next.js متكامل مصمم لجلب وعرض بيانات المطاعم والوجبات وقوائم الطعام (Menus) المجلوبة من منصة Glovo (خاصة بمدينة وجدة). 

يتكون النظام من 3 طبقات أساسية:
1. **طبقة الاستخراج (Scraper System):** تعتمد على Playwright لتصفح منصة Glovo واستخراج الـ Flight Payload (الموجود داخل هيكل Next.js RSC في صفحات Glovo).
2. **طبقة البيانات وقاعدة البيانات (Database & Ingestion):** سكريبت يدير عملية الترقية والتحديث (`Upsert`) للبيانات في قاعدة بيانات **MongoDB** بدون تكرار أو حذف غير مقصود.
3. **طبقة العرض والواجهة الأمامية (Frontend UI):** واجهة كروت وصفحات مطاعم تفاعلية مبنية بـ Next.js و React Tailwind/CSS تعرض التصنيفات والوجبات والأسعار والتخفيضات.

---

## 2. 🔄 مسار البيانات الكامل (End-to-End Data Flow)

```
 ┌──────────────────────┐      ┌────────────────────────┐      ┌─────────────────────────┐
 │   1. Glovo Website   │ ───> │  2. Playwright Scraper │ ───> │ 3. Scraped JSON Files   │
 │ (HTML / RSC Flight)  │      │ (RSC Payload Parsing)  │      │ data/scraped/stores/*.json │
 └──────────────────────┘      └────────────────────────┘      └─────────────────────────┘
                                                                            │
 ┌──────────────────────┐      ┌────────────────────────┐                   │
 │   5. Frontend UI     │ <─── │   4. MongoDB Database  │ <─────────────────┘
 │ (Next.js App Pages)  │      │ (Restaurants/Products) │  (scripts/import/run-import.js)
 └──────────────────────┘      └────────────────────────┘
```

### **خطوات المسار التفصيلية:**
1. **الاستكشاف (Listing Scraping):** يقوم السكرابر بزيارة صفحة Glovo الرئيسية للمدينة واستخراج قائمة slugs والمطاعم المتاحة وتخزينها في `data/scraped/index.json`.
2. **استخراج المنيو (Store Page Extraction):** لكل مطعم، يتم تنزيل الـ HTML وقراءة الأجزاء المشفرة `self.__next_f.push` لاستخراج الكائنات `STORE` و `LIST` و `PRODUCT_ROW`.
3. **التخزين في ملفات JSON:** حفظ بيانات المطعم والوجبات والتصنيفات في ملف مخصص داخل `data/scraped/stores/{slug}.json`.
4. **الاستيراد للـ DB (Import Step):** يقدم سكريبت `run-import.js` عملية مطابقة وتحديث (`findOneAndUpdate`) للـ MongoDB في مجموعات: `restaurants`, `categories`, `products`.
5. **خدمة العرض (Service Layer):** يقوم `lib/restaurant-service.ts` بالاستعلام من MongoDB وتحويل الكائنات إلى صيغ محسنة تُعرض عبر صفحات التطبيق.

---

## 3. 📝 صيغ الـ JSON (JSON Formats)

### **أولاً: صيغة JSON الناتجة عن السكرابر (`data/scraped/stores/restaurant-slug.json`)**

```json
{
  "slug": "mcdonalds-oujda",
  "name": "McDonald's®",
  "glovoUrl": "https://glovoapp.com/ma/fr/oujda/mcdonalds-ouj/",
  "rating": "94%",
  "reviews": "500+",
  "cuisines": ["Burgers", "Fast Food"],
  "image": "https://glovo.dhmedia.io/image/customer-assets-glovo/store_logos/...",
  "logoUrl": "https://glovo.dhmedia.io/image/customer-assets-glovo/store_logos/...",
  "promotion": null,
  "open": true,
  "dataMissing": false,
  "glovoStoreId": 123456,
  "scrapedAt": "2026-08-31T14:00:00.000Z",
  "categories": [
    {
      "name": "Nos Menus",
      "products": [
        {
          "name": "Menu Big Mac",
          "description": "Servi avec frites et boisson au choix.",
          "price": 65.00,
          "oldPrice": 75.00,
          "discount": 13,
          "image": "https://glovo.dhmedia.io/image/...",
          "available": true
        }
      ]
    }
  ]
}
```

---

### **ثانياً: صيغة الـ Schema داخل MongoDB**

بيانات المطعم تُقسم على 3 Collections مرتبطة ببعضها:

1. **`restaurants` Collection:**
```json
{
  "_id": ObjectId("64f8a1b..."),
  "name": "McDonald's®",
  "slug": "mcdonalds-oujda",
  "city": "oujda",
  "source": "glovo",
  "rating": "94%",
  "cuisines": ["Burgers"],
  "logoUrl": "https://glovo.dhmedia.io/...",
  "image": "https://glovo.dhmedia.io/...",
  "open": true,
  "dataMissing": false,
  "lastScrapedAt": ISODate("2026-08-31T14:00:00.000Z")
}
```

2. **`categories` Collection:**
```json
{
  "_id": ObjectId("64f8a2c..."),
  "restaurantId": ObjectId("64f8a1b..."),
  "name": "Nos Menus",
  "slug": "nos-menus",
  "position": 0
}
```

3. **`products` Collection:**
```json
{
  "_id": ObjectId("64f8a3d..."),
  "restaurantId": ObjectId("64f8a1b..."),
  "categoryId": ObjectId("64f8a2c..."),
  "slug": "mcdonalds-oujda__nos-menus__menu-big-mac",
  "name": "Menu Big Mac",
  "description": "Servi avec frites et boisson au choix.",
  "price": 65,
  "oldPrice": 75,
  "discount": 13,
  "image": "https://glovo.dhmedia.io/...",
  "available": true,
  "position": 0
}
```

---

### **ثالثاً: صيغة البيانات المرجعة للواجهة الأمامية (Frontend Output JSON)**

يتم تجهيز البيانات عبر `lib/restaurant-service.ts` لتعود بالشكل التالي لـ Next.js Client Component:

```json
{
  "name": "McDonald's®",
  "slug": "mcdonalds-oujda",
  "image": "https://glovo.dhmedia.io/...",
  "logoUrl": "https://glovo.dhmedia.io/...",
  "rating": "94%",
  "reviews": "500+",
  "deliveryTime": null,
  "deliveryFee": null,
  "cuisine": "Burgers",
  "cuisines": ["Burgers"],
  "address": "Oujda, Maroc",
  "hours": "Ouvert",
  "open": true,
  "dataMissing": false,
  "categories": [
    {
      "id": "64f8a2c...",
      "name": "Nos Menus",
      "slug": "nos-menus",
      "products": [
        {
          "id": "64f8a3d...",
          "name": "Menu Big Mac",
          "description": "Servi avec frites et boisson au choix.",
          "price": 65,
          "oldPrice": 75,
          "discount": 13,
          "image": "https://glovo.dhmedia.io/...",
          "category": "",
          "available": true
        }
      ]
    }
  ]
}
```

---

### **رابعاً: صيغة المنتجات ذات الخيارات المتعددة (Multi-Choices / Option Groups Customization)**

بالنسبة للوجبات المتطورة التي تتطلب تخصيصاً (مثل اختيارات الـ Menu في McDonald's: اختيار المشروب، اختيار الحجم، الإضافات)، يتم استخراج شاشات التخصيص (`PRODUCT_VIEW_SCREEN_V1` / `ATTRIBUTES_GROUP`) وتحويلها إلى الصيغة التالية:

```json
{
  "id": "prod_41931090815",
  "name": "Menu Duo Filet-o-Fish™",
  "description": "Servi avec frites et 2 boissons au choix.",
  "price": 82.00,
  "currency": "MAD",
  "available": true,
  "position": 0,
  "option_groups": [
    {
      "id": "6088708084",
      "name": "Choix Boisson",
      "description": "Choose 1 item",
      "required": true,
      "min": 1,
      "max": 1,
      "position": 0,
      "options": [
        {
          "id": "13064255379",
          "name": "McFizz™ Mojito",
          "price": 6.00,
          "available": true
        },
        {
          "id": "13064255353",
          "name": "Petit Coca Cola®",
          "price": 0.00,
          "available": true
        }
      ]
    }
  ]
}
```

---

## 4. 🤖 آلية الاستخراج والـ Agent / Extractor Logic

بدلاً من الاعتماد على Scraping التقليدي المعتمد على الـ DOM (والذي يتغير باستمرار وقد يفشل عند التصفح)، يستخرج السكرابر البيانات المباشرة من **React Server Components (RSC Flight Data)** التي يرسلها سيرفر Glovo في الـ HTML.

### **الموجه / منطق الاستخراج (Extraction Logic / Rules):**

* **استخراج الـ Payload:**
  يتم البحث عن جميع مقاطع `self.__next_f.push` وتجميع السلاسل النصية المفككة.
* **مطابقة الكائنات (Entity Extraction Patterns):**
  - **المطعم:** البحث عن مصفوفة الكائن `"store":{"id":..., "name":"..."}`.
  - **التصنيفات والقوائم:** البحث عن النمط `"type":"LIST","data":`.
  - **الوجبات:** استخراج العناصر الذاتية `"type":"PRODUCT_ROW"` واستخراج:
    - الاسم (`r.name`)
    - الوصف (`r.description`)
    - السعر والصور وتنسيق التخفيضات (`promotions`).
* **معالجة الصور (`dhImageUrl`):**
  الصور في Glovo تأتي بصيغة معرفات مثل `dh:customer-assets-glovo/...`. يتم تحويلها تلقائياً بفك التشفير وإنشاء رابط مباشر بـ base64 لشاشة العرض:
  `https://glovo.dhmedia.io/image/{path}?t={base64_params}`

---

## 5. 💻 الأوامر وطريقة تشغيل المشروع

1. **تشغيل السكرابر لجلب مطاعم مدينة وجدة:**
   ```bash
   node scripts/scraper/run.js --city=oujda
   ```
2. **استيراد البيانات المجلوبة إلى MongoDB:**
   ```bash
   node scripts/import/run-import.js
   ```
3. **تشغيل واجهة المستخدم Next.js:**
   ```bash
   npm run dev
   ```

---

### 🌟 الخلاصة
يتميز المشروع بنظام **Robust Scraper Pipeline** يتعامل مع بيئة Glovo المعقدة، ويسحب البيانات بصيغة هيكلية صافية (Pure RSC Flight Payload) ثم يدمجها في قاعدة البيانات ويعرضها بسلاسة وبأعلى كفاءة في الـ Frontend.
