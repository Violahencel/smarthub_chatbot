import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:3000/api';

async function testAidoOrderAPI() {
  try {
    console.log('Starting Aido Order Processing API test...');

    // CREATE: Test file upload
    console.log('\nTesting file upload...');
    const formData = new FormData();
    
    // Create a test PDF file
    const testPdfPath = path.join(__dirname, 'test.pdf');
    const testContent = '%PDF-1.4\nTest PDF content';  // Basic PDF header
    fs.writeFileSync(testPdfPath, testContent);
    
    // Add file to form data
    formData.append('files', fs.createReadStream(testPdfPath), {
      filename: 'test.pdf',
      contentType: 'application/pdf',
      knownLength: testContent.length
    });

    // Get headers from form data
    const headers = formData.getHeaders();
    
    // Make the upload request
    const uploadResponse = await fetch(`${BASE_URL}/aido-order/upload`, {
      method: 'POST',
      body: formData as unknown as BodyInit,
      headers: {
        ...headers,
        'Accept': 'application/json'
      }
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}\n${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult);

    // Clean up test file
    fs.unlinkSync(testPdfPath);

    // FIND: Test retrieving records
    console.log('\nTesting record retrieval...');
    const findResponse = await fetch(`${BASE_URL}/aido-order`);
    if (!findResponse.ok) {
      throw new Error(`Find failed: ${findResponse.statusText}`);
    }

    const findResult = await findResponse.json();
    console.log('Find result:', findResult);

    console.log('\nAido Order Processing API test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAidoOrderAPI(); 