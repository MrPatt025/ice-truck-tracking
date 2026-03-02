jest.mock("pg", () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  };
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock("bcryptjs", () => ({
  hashSync: () => "hashed",
  compareSync: () => true,
  hash: () => Promise.resolve("hashed"),
  compare: () => Promise.resolve(true),
  genSalt: () => Promise.resolve("salt"),
}));
