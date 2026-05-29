# Shippo packing rules (active products)

Live Shippo rates and labels use **approved box packing only**. All other products fall back to flat-rate shipping at checkout and cannot auto-create labels until a packing rule exists.

## Approved products

| Product | Units per box | Box (L × W × H inches) | Unit weight |
|---------|---------------|-------------------------|-------------|
| 2 lb licks | 6 | 10 × 10 × 6 | 2 lb |
| 4 lb licks | 4 | 10 × 10 × 6 | 4 lb |
| 6 lb licks | 4 | 9.5 × 9.5 × 5.5 | 6 lb |
| 30 lb block | 1 | 8.5 × 7.5 × 6.5 | 30 lb |
| 3 lb fine grain pouches (incl. edible) | 6 | 10 × 10 × 6 | 3 lb |
| 6 lb fine grain pouches (incl. edible) | 3 | 10 × 10 × 6 | 6 lb |
| 1 lb jar fine grain edible | 9 | 10 × 10 × 6 | 1 lb |

## How matching works

Products are matched by **slug and name** (from the database) using rules in:

`src/lib/shippo/packing/rules.ts`

| `himalayan-salt-licks-horses` | 2 lb licks (default catalog listing) |
- `himalayan-rock-salt-6lbs-pouch` → 6 lb pouch rule  
- Names containing `2 lb` + `lick` → 2 lb lick rule  

Products without a match (e.g. 45 lb bags, generic listings without size) **do not** use Shippo parcel math.

## Multi-box orders

Quantity is split into full boxes per rule. Example: **7 × 2 lb licks** → 2 parcels (6 + 1), both **10 × 10 × 6**, weights **12 lb** and **2 lb**.

## Checkout behavior

- Supported cart only → live carrier rates from Shippo  
- Unsupported product in cart → message shown, **standard flat rates** used ($9.95 / $18.95 / free over $50)  
- Admin label creation blocked for unsupported SKUs with a clear error  

## Adding a new SKU

1. Use a product **name or slug** that matches an existing rule pattern, **or**  
2. Add the slug to the rule’s `slugs` array in `rules.ts`, **or**  
3. Add a new entry to `ACTIVE_PACKING_RULES` (order matters — specific rules first)

Run `npm run check:packing` after changes.
