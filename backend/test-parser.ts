#!/usr/bin/env bun
/**
 * Test file parser utilities
 */
import { parseCSV, parseTSV, parseJSON } from "./src/utils/fileParser";

// Test CSV parsing
console.log("Testing CSV Parser...");
const csvData = `agreement,annotation_id,annotator,confidence_score,created_at,cuisine_country_style,dietary_restriction,dish_course,dish_type,product_description,product_id,product_name,restaurant_name
yes,ANN001,john@example.com,0.95,2024-01-15T10:30:00Z,Italian,vegetarian,main,pasta,Delicious homemade pasta with fresh tomatoes,P001,Pasta Primavera,Bella Italia
yes,ANN002,jane@example.com,0.88,2024-01-15T11:00:00Z,Mexican,gluten-free,appetizer,tacos,Crispy corn tacos with authentic spices,P002,Street Tacos,Casa Mexico
no,ANN003,bob@example.com,0.92,2024-01-15T11:30:00Z,Japanese,none,main,sushi,Fresh sushi rolls with premium fish,P003,Salmon Roll,Tokyo Sushi`;

try {
  const result = parseCSV(csvData);
  console.log(`✓ Parsed ${result.rows.length} rows`);
  console.log(`✓ Detected ${result.columns.length} columns`);
  console.log("\nColumn Schema:");
  result.columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type}): ${col.displayName}`);
  });
  console.log("\nFirst Row:");
  console.log(JSON.stringify(result.rows[0], null, 2));
} catch (error) {
  console.error("✗ CSV parsing failed:", error);
}

// Test TSV parsing
console.log("\n\nTesting TSV Parser...");
const tsvData = `product_id\tproduct_name\tprice\tin_stock
P001\tPasta Primavera\t12.99\ttrue
P002\tStreet Tacos\t9.99\tfalse`;

try {
  const result = parseTSV(tsvData);
  console.log(`✓ Parsed ${result.rows.length} rows`);
  console.log(`✓ Detected ${result.columns.length} columns`);
  console.log("\nColumn Schema:");
  result.columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type}): ${col.displayName}`);
  });
} catch (error) {
  console.error("✗ TSV parsing failed:", error);
}

// Test JSON parsing
console.log("\n\nTesting JSON Parser...");
const jsonData = JSON.stringify([
  {
    id: 1,
    name: "John Doe",
    age: 30,
    active: true,
    metadata: { role: "admin", level: 5 }
  },
  {
    id: 2,
    name: "Jane Smith",
    age: 25,
    active: false,
    metadata: { role: "user", level: 2 }
  }
]);

try {
  const result = parseJSON(jsonData);
  console.log(`✓ Parsed ${result.rows.length} rows`);
  console.log(`✓ Detected ${result.columns.length} columns`);
  console.log("\nColumn Schema:");
  result.columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type}): ${col.displayName}`);
  });
  console.log("\nFirst Row:");
  console.log(JSON.stringify(result.rows[0], null, 2));
} catch (error) {
  console.error("✗ JSON parsing failed:", error);
}

console.log("\n\n✅ All parser tests completed");
