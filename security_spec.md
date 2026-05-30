# Zero-Trust Firestore Security Specification

This document details the Zero-Trust security specifications, data invariants, and the adversarial "Dirty Dozen" payload test cases utilized to validate our Firestore ruleset.

## 1. Data Invariants

1. **User Identity Isolation**: A user can only access and modify their own `/users/{userId}` record. A user cannot update their own `role` or escalate privileges to `admin`.
2. **Deterministic Order Progression**: Customers can create orders but cannot modify their `status` or `packingStatus` after creation. Status progression (`confirmed`, `dispatched`, `delivered`) and packing status (`ready`, `delayed`) can only be modified by matching sellers, riders, or admins.
3. **Immutability of Key Metadata**: Fields such as `createdAt`, `userId`, `customerPhone` in orders are strictly immutable once created.
4. **Valuation Protection**: All prices, earnings, subtotals, and wallet balances must be non-negative. Customers cannot self-increment their `walletBalance`.
5. **Campaign Safety**: Banners, categories, and coupons are read-only for public/customers, and can only be set or modified by admins.

---

## 2. The "Dirty Dozen" Adversarial Payloads

The following 12 payloads are designed to challenge our rules. Every attempt below **must** return `PERMISSION_DENIED`.

### Payload 1: Self-Role Escalation (Privilege Escalation)
* **Goal**: Normal user attempts to self-promote to admin.
* **Target Path**: `/users/attacker_uid`
* **Payload**:
  ```json
  {
    "id": "attacker_uid",
    "email": "attacker@gmail.com",
    "phone": "9999999999",
    "role": "admin",
    "name": "Attacker",
    "createdAt": "2026-05-30T04:14:04Z"
  }
  ```

### Payload 2: Self-Wallet Balance Invariant Infraction (Direct Wallet Forgery)
* **Goal**: Customer attempts to directly modify their own wallet balance without buying it through the payment gateway.
* **Target Path**: `/users/victim_uid` (where attacker owns the document but alters balance)
* **Payload**:
  ```json
  {
    "walletBalance": 1000000
  }
  ```

### Payload 3: Identity Spoofing on User Profiles
* **Goal**: Attacker tries to modify victim's profile.
* **Target Path**: `/users/victim_uid`
* **Payload**:
  ```json
  {
    "name": "Hacked Profile"
  }
  ```

### Payload 4: Identity Spoofing on Orders (Customer Forgery)
* **Goal**: Guest or attacker creates an order claiming to be another customer.
* **Target Path**: `/orders/fake_order_1`
* **Payload**:
  ```json
  {
    "id": "fake_order_1",
    "customerPhone": "9111111111",
    "customerName": "Victim Customer",
    "subtotal": 100,
    "deliveryFee": 25,
    "discount": 0,
    "total": 125,
    "status": "placed",
    "createdAt": "2026-05-30T04:14:04Z",
    "address": "Victim Home Address",
    "paymentMethod": "COD",
    "sellerId": "s1",
    "items": []
  }
  ```

### Payload 5: Unauthorized Global Coupon Spoilage
* **Goal**: Attacker attempts to override/disable a dynamic coupon.
* **Target Path**: `/coupons/FAST50`
* **Payload**:
  ```json
  {
    "code": "FAST50",
    "discountType": "percentage",
    "discountValue": 99,
    "minOrderValue": 10,
    "description": "Exploit!",
    "isActive": false
  }
  ```

### Payload 6: Malicious Banner Addition or Spam Inject
* **Goal**: Attacker tries to display unsolicited banners on the home screen carousel.
* **Target Path**: `/banners/spam_banner_99`
* **Payload**:
  ```json
  {
    "id": "spam_banner_99",
    "title": "SPAM AD",
    "imageUrl": "https://malicious.link/hacked.jpg",
    "isActive": true
  }
  ```

### Payload 7: Product Price Poisoning (Zero/Negative Price Injection)
* **Goal**: Attacker creates or edits a product with a negative price to gain free goods.
* **Target Path**: `/products/poison_prod`
* **Payload**:
  ```json
  {
    "id": "poison_prod",
    "name": "Poison Apple",
    "price": -500,
    "image": "apple.jpg",
    "category": "veg-fruits",
    "stock": 100,
    "unit": "1kg",
    "sellerId": "s1",
    "sellerName": "Vasant Kunj Base",
    "deliveryMinutes": 10,
    "description": "Poisoned prices"
  }
  ```

### Payload 8: Direct Order Status Shortcut (Bypassing Delivery Runner)
* **Goal**: Customer attempts to directly transition an order to "delivered" to avoid paying COD or bypass courier tracking.
* **Target Path**: `/orders/my_order` (owned by user but attempting unauthorized transition)
* **Payload**:
  ```json
  {
    "status": "delivered"
  }
  ```

### Payload 9: Unauthorized Rider Status Forgery (Rider Hijacking)
* **Goal**: Casual visitor disables or modifies a rider's profile.
* **Target Path**: `/riders/rider_max`
* **Payload**:
  ```json
  {
    "status": "offline",
    "earnings": 999999
  }
  ```

### Payload 10: Path Variable ID Poisoning
* **Goal**: Attacker sends a long garbage string (Denial of Wallet resource attack) as a document ID.
* **Target Path**: `/users/very_long_garbage_id_representing_over_1kb_of_junk_text_here_...`
* **Payload**:
  ```json
  {
    "id": "very_long_garbage_id_..."
  }
  ```

### Payload 11: Immutable Timestamp Manipulation (Temporal Spoofing)
* **Goal**: Attacker tries to modify `createdAt` of an order after placement.
* **Target Path**: `/orders/order_123`
* **Payload**:
  ```json
  {
    "createdAt": "2020-01-01T00:00:00Z"
  }
  ```

### Payload 12: Administrative Function Escalation (Simulated Claims Hijack)
* **Goal**: Attacker calls writes acting as an unverified/anonymous admin.
* **Target Path**: `/categories/new_cat`
* **Payload**:
  ```json
  {
    "id": "new_cat",
    "name": "Exploded Category",
    "icon": "Bomb",
    "color": "bg-red-500"
  }
  ```

---

## 3. The Test Runner Reference (`firestore.rules.test.ts`)

```typescript
import { 
  assertFails, 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

describe('Firestore Security Rules: Dirty Dozen Challenge', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'capable-chain-f4jp1',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('Payload 1: Prevents self-promoting to admin', async () => {
    const context = testEnv.authenticatedContext('attacker_uid');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'users', 'attacker_uid'), {
      id: 'attacker_uid',
      email: 'attacker@gmail.com',
      phone: '9999999999',
      role: 'admin',
      name: 'Attacker',
      createdAt: new Date().toISOString()
    }));
  });

  it('Payload 2: Prevents direct wallet forgery', async () => {
    const context = testEnv.authenticatedContext('attacker_uid');
    const db = context.firestore();
    await assertFails(updateDoc(doc(db, 'users', 'attacker_uid'), {
      walletBalance: 1000000
    }));
  });
});
```
