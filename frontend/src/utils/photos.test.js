import { getFirstPhoto, parsePhotos } from "./photos";

const URL_A = "https://api.cotality.com/trestle/Media/Property/PHOTO-Jpeg/1/1/a";
const URL_B = "https://api.cotality.com/trestle/Media/Property/PHOTO-Jpeg/1/2/b";

describe("parsePhotos", () => {
    it("parses a JSON array of URLs, including MySQL's escaped slashes", () => {
        const raw = JSON.stringify([URL_A, URL_B]).replace(/\//g, "\\/");
        expect(parsePhotos(raw)).toEqual([URL_A, URL_B]);
    });

    it.each([
        ["an empty string", ""],
        ["whitespace", "   "],
        ["null", null],
        ["undefined", undefined],
        ["malformed JSON", "[\"https://example.com/a.jpg\""],
        ["an empty array", "[]"],
        ["a JSON object", "{\"url\":\"https://example.com/a.jpg\"}"],
        ["the string null", "null"],
        ["a number", 42],
    ])("returns [] for %s", (_label, raw) => {
        expect(parsePhotos(raw)).toEqual([]);
    });

    it("skips entries that aren't URLs", () => {
        expect(parsePhotos(JSON.stringify([null, "", 5, "not a url", URL_A]))).toEqual([URL_A]);
    });

    it("accepts a bare URL or an already-parsed array", () => {
        expect(parsePhotos(URL_A)).toEqual([URL_A]);
        expect(parsePhotos([URL_A, URL_B])).toEqual([URL_A, URL_B]);
    });
});

describe("getFirstPhoto", () => {
    it("returns the first photo URL", () => {
        expect(getFirstPhoto(JSON.stringify([URL_A, URL_B]))).toBe(URL_A);
    });

    it("returns null when there are no usable photos", () => {
        expect(getFirstPhoto("")).toBeNull();
    });
});
