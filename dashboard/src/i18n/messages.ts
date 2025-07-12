export const messages = {
  en: {
    dashboard: {
      title: 'Ice Truck Tracking Dashboard',
      trucks: {
        active: 'Active trucks: {count}',
        inactive: 'Inactive trucks: {count}',
        total: 'Total: {count}',
      },
      map: {
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        resetView: 'Reset view',
        toggleClustering: 'Toggle clustering',
        toggleHeatmap: 'Toggle heatmap',
      },
      alerts: {
        geofence: 'Geofence violation',
        temperature: 'Temperature alert',
        speed: 'Speed limit exceeded',
        offline: 'Truck offline',
      },
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      save: 'Save',
      cancel: 'Cancel',
    },
  },
  th: {
    dashboard: {
      title: 'แดชบอร์ดติดตามรถขนส่งน้ำแข็ง',
      trucks: {
        active: 'รถที่ใช้งาน: {count} คัน',
        inactive: 'รถที่ไม่ใช้งาน: {count} คัน',
        total: 'รวม: {count} คัน',
      },
      map: {
        zoomIn: 'ขยายแผนที่',
        zoomOut: 'ย่อแผนที่',
        resetView: 'รีเซ็ตมุมมอง',
        toggleClustering: 'เปิด/ปิดการจัดกลุ่ม',
        toggleHeatmap: 'เปิด/ปิดแผนที่ความหนาแน่น',
      },
      alerts: {
        geofence: 'ละเมิดขอบเขต',
        temperature: 'แจ้งเตือนอุณหภูมิ',
        speed: 'เกินความเร็ว',
        offline: 'รถออฟไลน์',
      },
    },
    common: {
      loading: 'กำลังโหลด...',
      error: 'ข้อผิดพลาด',
      retry: 'ลองใหม่',
      save: 'บันทึก',
      cancel: 'ยกเลิก',
    },
  },
} as const
