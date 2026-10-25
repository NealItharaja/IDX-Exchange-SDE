import { ELLIPSIS, getPageNumbers } from "./pagination";

describe("getPageNumbers", () => {
    it("shows every page when there are 7 or fewer", () => {
        expect(getPageNumbers(1, 1)).toEqual([1]);
        expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("handles the start, middle and end of a long list", () => {
        expect(getPageNumbers(1, 24)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 24]);
        expect(getPageNumbers(5, 24)).toEqual([1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 24]);
        expect(getPageNumbers(24, 24)).toEqual([1, ELLIPSIS, 20, 21, 22, 23, 24]);
    });

    it("never repeats a page number and always includes the first and last page", () => {
        for (let total = 1; total <= 40; total++) {
            for (let current = 1; current <= total; current++) {
                const numbers = getPageNumbers(current, total).filter((page) => page !== ELLIPSIS);
                expect(new Set(numbers).size).toBe(numbers.length);
                expect(numbers).toContain(1);
                expect(numbers).toContain(total);
                expect(numbers).toContain(current);
            }
        }
    });
});
