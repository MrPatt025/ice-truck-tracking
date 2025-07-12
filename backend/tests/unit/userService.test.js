const userService = require('../../src/services/userService');

describe('UserService', () => {
  it('should return null for non-existent user login', async () => {
    const user = await userService.login('notfounduser', 'wrongpass');
    expect(user).toBeNull();
  });
});
