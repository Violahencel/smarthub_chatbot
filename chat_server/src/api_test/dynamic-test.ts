const BASE_URL = 'http://localhost:3000/api/dynamic';

async function testDynamicAPI() {
  const collection = 'test_collection';
  
  try {
    // Test CREATE
    console.log('\n=== Testing CREATE ===');
    const createResponse = await fetch(`${BASE_URL}/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        mode: "single case data",
        age: 25
      })
    });
    const createdData = await createResponse.json();
    console.log('Created record:', createdData);

    // Test CREATE multiple
    console.log('\n=== Testing CREATE Multiple ===');
    const createMultipleResponse = await fetch(`${BASE_URL}/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { name: 'User 1', email: 'user1@example.com', mode: "multiple case data", age: 25 },
        { name: 'User 2', email: 'user2@example.com', mode: "multiple case data", age: 26 }
      ])
    });
    const createdMultipleData = await createMultipleResponse.json();
    console.log('Created multiple records:', createdMultipleData);

    // Test FIND
    console.log('\n=== Testing FIND ===');
    const findResponse = await fetch(`${BASE_URL}/${collection}`);
    const foundData = await findResponse.json();
    console.log('All records:', foundData);

    // Test FIND with filter
    console.log('\n=== Testing FIND with filter ===');
    const filter = JSON.stringify({ name: 'Test User' });
    const findFilteredResponse = await fetch(`${BASE_URL}/${collection}?filter=${encodeURIComponent(filter)}`);
    const filteredData = await findFilteredResponse.json();
    console.log('Filtered records:', filteredData);

    // Test UPDATE
    console.log('\n=== Testing UPDATE ===');
    const recordToUpdate = foundData.records[0];
    const updateResponse = await fetch(`${BASE_URL}/${collection}/${recordToUpdate._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated User',
        age: 26
      })
    });
    const updatedData = await updateResponse.json();
    console.log('Updated record:', updatedData);

    // Test DELETE
    console.log('\n=== Testing DELETE ===');
    const deleteResponse = await fetch(`${BASE_URL}/${collection}/${recordToUpdate._id}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteResponse.json();
    console.log('Delete result:', deleteData);

    // Verify deletion
    console.log('\n=== Verifying deletion ===');
    const verifyResponse = await fetch(`${BASE_URL}/${collection}`);
    const remainingData = await verifyResponse.json();
    console.log('Remaining records:', remainingData);

  } catch (error) {
    console.error('Error during API testing:', error);
  }
}

// Run the test
console.log('Starting Dynamic API test...');
testDynamicAPI().then(() => {
  console.log('\nTest completed');
}).catch(error => {
  console.error('Test failed:', error);
}); 