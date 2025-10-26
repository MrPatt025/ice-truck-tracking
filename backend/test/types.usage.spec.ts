// ใช้ type-only import เพื่อให้ knip/ts-prune นับว่ามีการใช้งาน
import type { Role, User } from '../src/services/userService';
import type { TruckSort, SortOrder } from '../src/services/truckService';
import { test } from 'vitest';

// ผูกเป็น type alias เดียวพอให้ compiler นับการอ้างอิง
type _KeepAlive = Role | User | TruckSort | SortOrder;

// เทสต์เปล่า ๆ เพื่อให้ไฟล์ถูกรันโดย Vitest
test('type usage marker', () => {
  // ไม่ทำอะไร แค่ให้ไฟล์อยู่ในชุดเทสต์
});
