import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveModelGroupKey,
  FEATURED_SHOES,
  formatPHP,
  getAvailableAngles,
  getModelColorways,
  type FeaturedShoe,
} from "../src/data/shoeCatalog.ts";

describe("Sole Purpose Frontend Catalog & Colorway Utilities", () => {
  it("deriveModelGroupKey normalizes quoted colorway names consistently", () => {
    assert.equal(
      deriveModelGroupKey("Caitlin 1 EP 'Hyper Royal'"),
      "caitlin-1-ep"
    );
    assert.equal(
      deriveModelGroupKey("Caitlin 1 EP 'Amarillo'"),
      "caitlin-1-ep"
    );
    assert.equal(deriveModelGroupKey("Ja 4 'Heat Check' EP"), "ja-4-ep");
  });

  it("getModelColorways scopes swatches strictly to the same shoe model", () => {
    const caitlinRoyal = FEATURED_SHOES.find(
      (s) => s.id === "caitlin-1-ep-royal"
    )!;
    const caitlinColorways = getModelColorways(caitlinRoyal, FEATURED_SHOES);
    assert.deepEqual(
      caitlinColorways.map((s) => s.id).sort(),
      ["caitlin-1-ep-gold", "caitlin-1-ep-royal"]
    );

    const ja4 = FEATURED_SHOES.find((s) => s.id === "ja-4-heat-check-ep")!;
    const ja4Colorways = getModelColorways(ja4, FEATURED_SHOES);
    assert.deepEqual(
      ja4Colorways.map((s) => s.id),
      ["ja-4-heat-check-ep"]
    );
  });

  it("getModelColorways also links parentProductId variants regardless of model title", () => {
    const parent: FeaturedShoe = {
      ...FEATURED_SHOES[0],
      _id: "obj-1",
      id: "shoe-alpha",
      name: "Kobe 8 Protro",
      modelGroup: "kobe-8-protro",
    };
    const sibling: FeaturedShoe = {
      ...FEATURED_SHOES[0],
      _id: "obj-2",
      id: "shoe-alpha-alt",
      name: "Kobe 8 Venice Beach",
      modelGroup: "custom-group",
      parentProductId: "obj-1",
    };
    const unrelated: FeaturedShoe = {
      ...FEATURED_SHOES[1],
      _id: "obj-3",
      id: "unrelated-shoe",
    };

    const grouped = getModelColorways(sibling, [parent, sibling, unrelated]);
    assert.deepEqual(
      grouped.map((s) => s.id).sort(),
      ["shoe-alpha", "shoe-alpha-alt"]
    );
  });

  it("getAvailableAngles filters uploaded angles and falls back to lateral", () => {
    const singleAngleShoe: FeaturedShoe = {
      ...FEATURED_SHOES[0],
      angles: { lateral: "/shoes/nike1.1.avif" },
    };
    const angles = getAvailableAngles(singleAngleShoe);
    assert.equal(angles.length, 1);
    assert.equal(angles[0].key, "lateral");
  });

  it("formatPHP formats Philippine Peso amounts cleanly", () => {
    assert.equal(formatPHP(7995), "₱7,995");
  });
});

