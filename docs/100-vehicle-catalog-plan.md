
# AutoLux 100-vehicle requirement — carried into Phase 3/4

The client requirement is to publish at least 100 real vehicle listings with genuine vehicle photographs and
credible prices. This is intentionally not faked in the authentication phase.

## Delivery plan
- Phase 3: public vehicle discovery and catalogue pages; create the vehicle catalogue schema and import format.
- Phase 4: branch-specific fleet inventory, availability, rental pricing, and booking integration.
- Phase 5: vehicle sales listings, product shop and payment/checkout workflows.

## Data quality rules
1. Each listing must represent a real manufacturer/model/year/trim combination.
2. Use image assets with documented rights or licensed/approved provider URLs. Do not hotlink random Google
   Images results or assume that a search result grants image rights.
3. Record image source, license/permission status, attribution requirements, retrieval date and alt text.
4. Separate MSRP/market asking price from AutoLux sale price and from AutoLux rental rates.
5. Rental prices are company pricing decisions, not manufacturer facts. Store daily, weekly and monthly rates
   per branch/vehicle and label them as AutoLux rates.
6. Vehicle sale prices must be sourced from AutoLux inventory or a documented public listing, with date and
   location. Do not present an MSRP as the actual asking price of a used vehicle.
7. Display USD, note taxes/fees separately, and use a "price subject to availability" notice where appropriate.
8. Validate that every one of the 100 records has a real image, verified model/year, source URL, and price basis
   before publishing.

## Public pricing references reviewed for planning
- GetRentacar live rental market intelligence: https://getrentacar.com/en-US/intelligence
- Rochester Car Rental fleet and dated daily-rate examples: https://www.rochester.rentals/fleet
- Dynasty Luxury Rentals fleet listings: https://dynastyluxuryrentals.com/fleet/
- Rent-Trip USA premium fleet examples: https://rent-trip.com/usa/premium/

These sources demonstrate that rental rates vary substantially by class, city, date, supplier and availability.
They are market references, not AutoLux quotes or authorization to copy another company's inventory/photos.
