import { describe, expect, it, vi } from "vitest";
import { finiteNumberOr, setOptionalFiniteNumberFromInput } from "./optional-number-input";

describe("optional number input helpers", () => {
	it("setOptionalFiniteNumberFromInput uses empty string instead of coercing to 0", () => {
		const setValue = vi.fn();
		setOptionalFiniteNumberFromInput("", setValue);
		expect(setValue).toHaveBeenCalledWith("");
	});

	it("finiteNumberOr falls back when empty", () => {
		expect(finiteNumberOr("", 7)).toBe(7);
		expect(finiteNumberOr(3, 7)).toBe(3);
	});
});
