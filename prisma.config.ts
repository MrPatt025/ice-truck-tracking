// prisma.config.ts
import { defineConfig } from '@prisma/internals';

export default defineConfig({
  // ตรงนี้ถ้าต้องการ override ค่า เช่น schemaPath หรือ generators
  // ถ้าไม่ต้องการ อนุโลมให้ไฟล์ว่างเพื่อเลิกใช้ package.json#prisma
});
