const express = require('express');
const { protect } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { validate, schemas } = require('../../middleware/validation');
const shopService = require('../../services/shopService');
const { AppError } = require('../../middleware/error');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const shops = await shopService.getAllShops();
    res.status(200).json({
      status: 'success',
      results: shops.length,
      data: shops,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const shop = await shopService.getShopById(req.params.id);
    if (!shop) {
      return next(new AppError('Shop not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: shop,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('shops:create'), validate(schemas.shop), async (req, res, next) => {
  try {
    const newShop = await shopService.createShop(req.body);
    res.status(201).json({
      status: 'success',
      data: newShop,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
