import { describe, it, expect } from "vitest";
import { convertDateFormat, generateFilename, sanitizeVendor } from "../receiptFilename";

describe("convertDateFormat", () => {
	it("converts MM/DD/YYYY with slashes", () => {
		expect(convertDateFormat("10/25/2024")).toBe("2024.10.25");
	});

	it("converts MM.DD.YYYY with dots", () => {
		expect(convertDateFormat("10.25.2024")).toBe("2024.10.25");
	});

	it("converts MM-DD-YYYY with dashes", () => {
		expect(convertDateFormat("10-25-2024")).toBe("2024.10.25");
	});

	it("pads single-digit month and day", () => {
		expect(convertDateFormat("1/5/2024")).toBe("2024.01.05");
	});

	it("returns original string when no separator found", () => {
		expect(convertDateFormat("20241025")).toBe("20241025");
	});

	it("returns empty string for empty input", () => {
		expect(convertDateFormat("")).toBe("");
	});
});

describe("generateFilename", () => {
	it("generates standardized filename", () => {
		expect(generateFilename("Walmart", "10/25/2024", "42.50", "receipt.pdf"))
			.toBe("WALMART_2024.10.25_42.50.pdf");
	});

	it("strips non-alphanumeric from vendor", () => {
		expect(generateFilename("Mc Donald's", "01/01/2024", "10.00", "file.pdf"))
			.toBe("MCDONALDS_2024.01.01_10.00.pdf");
	});

	it("returns currentFilename when vendor is null", () => {
		expect(generateFilename(null, "01/01/2024", "10.00", "original.pdf"))
			.toBe("original.pdf");
	});

	it("returns currentFilename when date is null", () => {
		expect(generateFilename("Vendor", null, "10.00", "original.pdf"))
			.toBe("original.pdf");
	});

	it("returns currentFilename when amount is null", () => {
		expect(generateFilename("Vendor", "01/01/2024", null, "original.pdf"))
			.toBe("original.pdf");
	});

	it("defaults extension to pdf when currentFilename is null", () => {
		expect(generateFilename("Store", "01/01/2024", "5.00", null))
			.toBe("STORE_2024.01.01_5.00.pdf");
	});

	it("preserves original file extension", () => {
		expect(generateFilename("Store", "01/01/2024", "5.00", "receipt.jpg"))
			.toBe("STORE_2024.01.01_5.00.jpg");
	});
});

describe("sanitizeVendor", () => {
	it("removes special characters", () => {
		expect(sanitizeVendor("Mc Donald's!@#")).toBe("Mc_Donalds");
	});

	it("replaces spaces with underscores", () => {
		expect(sanitizeVendor("Best Buy")).toBe("Best_Buy");
	});

	it("preserves hyphens", () => {
		expect(sanitizeVendor("Chick-fil-A")).toBe("Chick-fil-A");
	});

	it("truncates to maxLength", () => {
		expect(sanitizeVendor("A".repeat(50), 10)).toBe("A".repeat(10));
	});

	it("uses default maxLength of 30", () => {
		expect(sanitizeVendor("B".repeat(50))).toBe("B".repeat(30));
	});
});
