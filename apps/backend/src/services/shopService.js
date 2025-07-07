const shopRepository = require('../repositories/shopRepository');

class ShopService {
    async getAllShops() {
        return shopRepository.getAll();
    }

    async getShopById(id) {
        return shopRepository.getById(id);
    }

    async createShop(shopData) {
        // สามารถเพิ่ม business validation logic ได้ที่นี่
        return shopRepository.create(shopData);
    }
}

module.exports = new ShopService(); 
