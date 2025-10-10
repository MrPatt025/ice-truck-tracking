jest.mock("sqlite3", () => ({
  verbose: () => ({
    Database: jest.fn(() => ({
      run(sql,_p,cb){ cb?.(null); return this },
      all(_s,_p,cb){ cb?.(null,[]) },
      get(_s,_p,cb){ cb?.(null,null) },
      close(cb){ cb?.() },
      serialize(fn){ fn?.() },
      on(){}, exec(_s,cb){ cb?.(null) },
    })),
  }),
}));
jest.mock("bcrypt", () => ({
  hashSync: () => "hashed",
  compareSync: () => true,
}));
