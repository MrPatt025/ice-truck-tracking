// routes/driver.route.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const bcrypt = require("bcrypt");

// ✅ GET พนักงานขับรถทั้งหมด (admin, owner)
router.get("/", auth(["admin", "owner"]), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM drivers ORDER BY start_date DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// ✅ POST เพิ่มพนักงานใหม่ (admin)
router.post("/", auth(["admin"]), async (req, res) => {
  const driver = req.body;

  // ตรวจสอบข้อมูลที่จำเป็น
  const requiredFields = ["driver_id", "full_name", "username", "password"];
  const missing = requiredFields.find(field => !driver[field]);
  if (missing) {
    return res.status(400).json({ message: `กรุณากรอกข้อมูลให้ครบถ้วน`, field: missing });
  }

  try {
    const [exist] = await db.query("SELECT * FROM drivers WHERE username = ?", [driver.username]);
    if (exist.length > 0) {
      return res.status(409).json({ message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
    }

    const hashedPassword = await bcrypt.hash(driver.password, 10);

    await db.query(
      `INSERT INTO drivers 
      (driver_id, full_name, national_id, license_number, username, password, address, phone, start_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driver.driver_id,
        driver.full_name,
        driver.national_id || null,
        driver.license_number || null,
        driver.username,
        hashedPassword,
        driver.address || null,
        driver.phone || null,
        driver.start_date || new Date()
      ]
    );

    res.json({ message: "เพิ่มพนักงานขับรถสำเร็จ" });
  } catch (err) {
    console.error("❌ POST /drivers error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// ✅ PUT แก้ไขข้อมูลพนักงานตาม id
router.put("/:id", auth(["admin"]), async (req, res) => {
  const driver = req.body;

  try {
    const [exist] = await db.query("SELECT * FROM drivers WHERE id=?", [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: "ไม่พบพนักงานขับรถที่ต้องการแก้ไข" });
    }

    // ตรวจสอบ username ซ้ำ (ถ้ามีการเปลี่ยน username)
    if (driver.username && driver.username !== exist[0].username) {
      const [usernameExist] = await db.query("SELECT * FROM drivers WHERE username = ? AND id != ?", [driver.username, req.params.id]);
      if (usernameExist.length > 0) {
        return res.status(409).json({ message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
      }
    }

    let updateQuery = "UPDATE drivers SET full_name=?, national_id=?, license_number=?, username=?, address=?, phone=?, start_date=?";
    let updateParams = [
      driver.full_name || null,
      driver.national_id || null,
      driver.license_number || null,
      driver.username || null,
      driver.address || null,
      driver.phone || null,
      driver.start_date || null
    ];

    // ถ้ามีการเปลี่ยน password ให้ hash password ใหม่
    if (driver.password && driver.password.trim() !== '') {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(driver.password, 10);
      updateQuery += ", password=?";
      updateParams.push(hashedPassword);
    }

    updateQuery += " WHERE id=?";
    updateParams.push(req.params.id);

    await db.query(updateQuery, updateParams);

    res.json({ message: "อัปเดตข้อมูลสำเร็จ" });
  } catch (err) {
    console.error("PUT /drivers/:id error:", err);
    res.status(500).json({ message: "อัปเดตไม่สำเร็จ", error: err.message });
  }
});

// ✅ DELETE พนักงานตาม id
router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const [exist] = await db.query("SELECT * FROM drivers WHERE id=?", [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ message: "ไม่พบพนักงานที่ต้องการลบ" });
    }

    await db.query("DELETE FROM drivers WHERE id=?", [req.params.id]);
    res.json({ message: "ลบข้อมูลสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "ไม่สามารถลบได้", error: err.message });
  }
});

module.exports = router;
