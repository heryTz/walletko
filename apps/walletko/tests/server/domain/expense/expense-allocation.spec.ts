import { makeExpenseAllocation } from "src/server/domain/expense/expense-allocation.factory";
import { Money } from "src/server/domain/shared/value-object/money";

describe("expense allocation", () => {
  it("adjust amount", () => {
    const pa = makeExpenseAllocation({});
    pa.allocate(new Money(30));
    expect(pa.data.amount.value).toBe(30);
  });
});
