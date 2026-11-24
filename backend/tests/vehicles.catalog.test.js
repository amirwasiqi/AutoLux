import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vehicles = JSON.parse(await readFile(path.join(here, '../src/modules/vehicles/seed-vehicles.json'), 'utf8'));

test('Phase 3 seeds exactly 100 distinct vehicle models', () => {
  assert.equal(vehicles.length, 100);
  assert.equal(new Set(vehicles.map((vehicle) => vehicle.slug)).size, 100);
  assert.equal(new Set(vehicles.map((vehicle) => vehicle.stock_code)).size, 100);
});

test('every seeded vehicle has realistic display fields and separate rental/sale prices', () => {
  for (const vehicle of vehicles) {
    assert.ok(vehicle.make && vehicle.model && vehicle.year);
    assert.ok(vehicle.image_search_query.includes(vehicle.make));
    assert.ok(vehicle.daily_rental_price_usd > 0);
    assert.ok(vehicle.sale_price_usd > 0);
    assert.ok(vehicle.weekly_rental_price_usd > 0);
    assert.ok(vehicle.monthly_rental_price_usd > 0);
    assert.equal(vehicle.is_demo, true);
    assert.equal(vehicle.published, true);
  }
});

test('price records identify their basis and source date', () => {
  for (const vehicle of vehicles) {
    assert.ok(['model_median', 'segment_estimate'].includes(vehicle.sale_price_basis));
    assert.ok(['published_model_rate', 'category_market_guide'].includes(vehicle.rental_price_basis));
    assert.equal(vehicle.price_reference_date, '2026-11-14');
    assert.match(vehicle.price_reference_url, /^https:\/\//);
    assert.match(vehicle.rental_price_reference_url, /^https:\/\//);
  }
});
