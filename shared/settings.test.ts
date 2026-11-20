import { describe, expect, it } from "vitest";
import { genuiSettings } from "./settings";

describe("genuiSettings", () => {
  it("shows the Gen-UI Gallery sidebar row by default", () => {
    const values = genuiSettings.schema.parse({});
    expect(values.showSidebarGallery).toBe(true);
  });

  it("keeps an explicit sidebar preference", () => {
    const values = genuiSettings.schema.parse({ showSidebarGallery: false });
    expect(values.showSidebarGallery).toBe(false);
  });
});
