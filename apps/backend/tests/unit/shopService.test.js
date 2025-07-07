const shopService = require('../../src/services/shopService');

describe('ShopService', () => {
  it('should return an array from getAllShops', async () => {
    const shops = await shopService.getAllShops();
    expect(Array.isArray(shops)).toBe(true);
  });

  it('should return null for non-existent shop', async () => {
    const shop = await shopService.getShopById(-1);
    expect(shop).toBeNull();
  });
});
