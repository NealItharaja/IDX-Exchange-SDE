-- Indexes for GET /api/properties
-- Run: docker exec -i idx-mysql-local mysql -uroot -p rets < db/indexes.sql

-- active_check has a DEFAULT '0000-00-00 00:00:00', which strict mode rejects on any ALTER
-- ("Invalid default value for 'active_check'"). Relax it for this session only.
SET SESSION sql_mode = REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', '');

-- City is compared as LOWER(TRIM(L_City)) = LOWER(TRIM(?)), so a plain index on L_City
-- can't be seeked into. This is a functional index on the exact same expression (MySQL 8.0.13+).
-- City + price is the most common combo; beds is tacked on so COUNT(*) is answered from the index alone.
CREATE INDEX idx_city_price_beds ON rets_property ((LOWER(TRIM(L_City))), L_SystemPrice, L_Keyword2);

-- Zip + price. Zip is matched with LIKE '92618%' which is still an index range scan.
CREATE INDEX idx_zip_price ON rets_property (L_Zip, L_SystemPrice);

-- Price range searches without a location (also covers price + beds).
CREATE INDEX idx_price_beds ON rets_property (L_SystemPrice, L_Keyword2);

-- Beds / baths searches without a location or price.
CREATE INDEX idx_beds_baths ON rets_property (L_Keyword2, LM_Dec_3);

ANALYZE TABLE rets_property;

-- To re-measure the "before" numbers:
-- DROP INDEX idx_city_price_beds ON rets_property;
-- DROP INDEX idx_zip_price ON rets_property;
-- DROP INDEX idx_price_beds ON rets_property;
-- DROP INDEX idx_beds_baths ON rets_property;
