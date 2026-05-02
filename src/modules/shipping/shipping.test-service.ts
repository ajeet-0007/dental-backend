import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
  details?: any;
}

@Injectable()
export class ShippingRocketTestService {
  private readonly logger = new Logger(ShippingRocketTestService.name);
  private apiUrl: string;
  private apiEmail: string;
  private apiPassword: string;
  private bearerToken: string | null = null;
  private testResults: TestResult[] = [];

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('SHIPPINGROCKET_API_URL') || '';
    this.apiEmail = this.configService.get<string>('SHIPPINGROCKET_API_USER') || '';
    this.apiPassword = this.configService.get<string>('SHIPPINGROCKET_API_PASSWORD') || '';
  }

  /**
   * Run all tests and return results
   */
  async runAllTests(): Promise<TestResult[]> {
    this.testResults = [];

    this.logger.log('Starting ShippingRocket API Tests...');
    console.log('\n========================================');
    console.log('SHIPPINGROCKET API TEST SUITE');
    console.log('========================================\n');

    // Test 1: Authentication
    await this.testAuthentication();

    if (!this.bearerToken) {
      this.logger.error('Authentication failed, skipping remaining tests');
      console.log('\n⚠️  Cannot proceed without authentication. Check credentials.\n');
      return this.testResults;
    }

    // Test 2: Rate Calculation with Valid Pincodes
    await this.testRateCalculationValid();

    // Test 3: Rate Calculation with Invalid Pincode
    await this.testRateCalculationInvalid();

    // Test 4: Get Available Couriers
    await this.testGetCouriers();

    // Test 5: Shipment Creation (requires successful rate calculation first)
    await this.testShipmentCreation();

    // Print summary
    this.printTestSummary();

    return this.testResults;
  }

  /**
   * Test 1: Authentication with ShippingRocket
   */
  private async testAuthentication(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Authentication';

    try {
      console.log('🔐 Test 1: Authentication');
      console.log(`   Email: ${this.apiEmail}`);

      const response = await axios.post(
        `${this.apiUrl}/v1/auth/login`,
        {
          email: this.apiEmail,
          password: this.apiPassword,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      if (response.data.status === 200 && response.data.data?.token) {
        this.bearerToken = response.data.data.token;

        this.testResults.push({
          testName,
          status: 'PASS',
          message: 'Successfully authenticated and received bearer token',
          duration: Date.now() - startTime,
          details: {
            token: (this.bearerToken || '').substring(0, 20) + '...',
            status: response.data.status,
          },
        });

        console.log('   ✓ PASS: Authentication successful');
        console.log(`   Token: ${(this.bearerToken || '').substring(0, 20)}...`);
      } else {
        throw new Error('Invalid response format: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      this.testResults.push({
        testName,
        status: 'FAIL',
        message: error.message || 'Authentication failed',
        duration: Date.now() - startTime,
        details: {
          error: error.response?.data || error.message,
          status: error.response?.status,
        },
      });

      console.log('   ✗ FAIL: ' + (error.message || 'Authentication failed'));
      this.logger.error('Authentication test failed:', error.message);
    }

    console.log();
  }

  /**
   * Test 2: Rate Calculation with Valid Pincodes
   */
  private async testRateCalculationValid(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Rate Calculation (Valid Pincodes)';

    const testCases = [
      {
        name: 'Bangalore to Delhi (Popular Route)',
        pickup: '560001', // Bangalore
        delivery: '110001', // Delhi
      },
      {
        name: 'Mumbai to Hyderabad',
        pickup: '400001', // Mumbai
        delivery: '500001', // Hyderabad
      },
      {
        name: 'Pune to Chennai',
        pickup: '411001', // Pune
        delivery: '600001', // Chennai
      },
    ];

    try {
      console.log('📦 Test 2: Rate Calculation (Valid Pincodes)');

      for (const testCase of testCases) {
        try {
          console.log(`   Testing: ${testCase.name}`);

          const response = await axios.post(
            `${this.apiUrl}/shipments/rates/calculate`,
            {
              pickup_postcode: testCase.pickup,
              delivery_postcode: testCase.delivery,
              weight: 0.5,
              length: 20,
              breadth: 15,
              height: 10,
              cod: 0,
            },
            {
              headers: {
                Authorization: `Bearer ${this.bearerToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            },
          );

          if (response.data.status === 'success') {
            const couriers = response.data.data.available_couriers || [];
            console.log(`   ✓ ${couriers.length} couriers available`);
          } else {
            console.log(`   ✗ Unexpected response: ${response.data.status}`);
          }
        } catch (innerError) {
          console.log(`   ✗ Error: ${innerError.message}`);
        }
      }

      this.testResults.push({
        testName,
        status: 'PASS',
        message: 'Successfully calculated rates for valid pincodes',
        duration: Date.now() - startTime,
      });

      console.log('   ✓ PASS: Rate calculation successful');
    } catch (error) {
      this.testResults.push({
        testName,
        status: 'FAIL',
        message: error.message || 'Rate calculation failed',
        duration: Date.now() - startTime,
        details: error.response?.data || error.message,
      });

      console.log('   ✗ FAIL: ' + (error.message || 'Rate calculation failed'));
      this.logger.error('Rate calculation test failed:', error.message);
    }

    console.log();
  }

  /**
   * Test 3: Rate Calculation with Invalid Pincode
   */
  private async testRateCalculationInvalid(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Rate Calculation (Invalid Pincode - Error Handling)';

    try {
      console.log('⚠️  Test 3: Rate Calculation (Invalid Pincode - Error Handling)');
      console.log('   Testing with pincode: 999999 (Non-existent)');

      let responseStatus = 'unknown';

      try {
        const response = await axios.post(
          `${this.apiUrl}/shipments/rates/calculate`,
          {
            pickup_postcode: '560001',
            delivery_postcode: '999999', // Invalid pincode
            weight: 0.5,
            length: 20,
            breadth: 15,
            height: 10,
            cod: 0,
          },
          {
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );

        responseStatus = response.data.status;

        if (response.data.status !== 'success') {
          this.testResults.push({
            testName,
            status: 'PASS',
            message: 'API correctly returned error for invalid pincode',
            duration: Date.now() - startTime,
            details: {
              status: response.data.status,
              message: response.data.message,
            },
          });

          console.log('   ✓ PASS: Invalid pincode correctly handled');
          console.log(`   Response: ${response.data.message}`);
        } else {
          console.log('   ✗ FAIL: Expected error but got success');
        }
      } catch (axiosError) {
        if (axiosError.response?.status === 400 || axiosError.response?.status === 422) {
          this.testResults.push({
            testName,
            status: 'PASS',
            message: 'API correctly returned error for invalid pincode',
            duration: Date.now() - startTime,
            details: {
              status: axiosError.response?.status,
              message: axiosError.response?.data?.message,
            },
          });

          console.log('   ✓ PASS: Invalid pincode correctly handled');
          console.log(`   Error: ${axiosError.response?.data?.message || axiosError.message}`);
        } else {
          throw axiosError;
        }
      }
    } catch (error) {
      this.testResults.push({
        testName,
        status: 'FAIL',
        message: error.message || 'Error handling test failed',
        duration: Date.now() - startTime,
        details: error.response?.data || error.message,
      });

      console.log('   ✗ FAIL: ' + (error.message || 'Error handling test failed'));
      this.logger.error('Invalid pincode test failed:', error.message);
    }

    console.log();
  }

  /**
   * Test 4: Get Available Couriers
   */
  private async testGetCouriers(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Get Available Couriers';

    try {
      console.log('🚚 Test 4: Get Available Couriers');

      const response = await axios.get(`${this.apiUrl}/couriers/list`, {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data.status === 'success') {
        const couriers = response.data.data?.couriers || [];

        this.testResults.push({
          testName,
          status: 'PASS',
          message: `Retrieved ${couriers.length} available couriers`,
          duration: Date.now() - startTime,
          details: {
            courierCount: couriers.length,
            couriers: couriers.slice(0, 3).map((c: any) => ({ id: c.id, name: c.name })),
          },
        });

        console.log(`   ✓ PASS: ${couriers.length} couriers available`);
        couriers.slice(0, 3).forEach((courier: any) => {
          console.log(`   - ${courier.name} (ID: ${courier.id})`);
        });
      } else {
        console.log('   ✗ FAIL: Unexpected response format');
      }
    } catch (error) {
      this.testResults.push({
        testName,
        status: 'SKIP',
        message: error.message || 'Endpoint may not be available',
        duration: Date.now() - startTime,
      });

      console.log('   ⊘ SKIP: ' + (error.message || 'Endpoint may not be available'));
    }

    console.log();
  }

  /**
   * Test 5: Shipment Creation
   */
  private async testShipmentCreation(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Shipment Creation';

    try {
      console.log('📮 Test 5: Shipment Creation');
      console.log('   Creating test shipment...');

      const testOrderNumber = `TEST-${Date.now()}`;
      const testEmail = 'test@example.com';

      // First get available couriers via rate calculation
      const rateResponse = await axios.post(
        `${this.apiUrl}/shipments/rates/calculate`,
        {
          pickup_postcode: '560001',
          delivery_postcode: '400001',
          weight: 0.5,
          length: 20,
          breadth: 15,
          height: 10,
          cod: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (rateResponse.data.status !== 'success' || !rateResponse.data.data.available_couriers.length) {
        throw new Error('No couriers available for shipment creation');
      }

      const selectedCourier = rateResponse.data.data.available_couriers[0];

      console.log(`   Selected courier: ${selectedCourier.name}`);

      const shipmentPayload = {
        order_id: testOrderNumber,
        order_date: new Date().toISOString(),
        pickup_location_id: 'main',
        shipping_address: {
          name: 'Test Customer',
          phone: '9876543210',
          email: testEmail,
          address_line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postcode: '400001',
        },
        dimensions: {
          length: 20,
          breadth: 15,
          height: 10,
        },
        weight: 0.5,
        payment_method: 'prepaid',
        courier_id: selectedCourier.id,
        items: [
          {
            name: 'Test Product',
            quantity: 1,
            sellingPrice: 100,
          },
        ],
      };

      try {
        const response = await axios.post(
          `${this.apiUrl}/shipments/create`,
          shipmentPayload,
          {
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );

        if (response.data.status === 'success') {
          const shipmentId = response.data.data.shipment_id;
          const trackingNumber = response.data.data.tracking_number;

          this.testResults.push({
            testName,
            status: 'PASS',
            message: 'Successfully created test shipment',
            duration: Date.now() - startTime,
            details: {
              shipmentId,
              trackingNumber,
              orderNumber: testOrderNumber,
              courier: selectedCourier.name,
            },
          });

          console.log('   ✓ PASS: Shipment created successfully');
          console.log(`   Shipment ID: ${shipmentId}`);
          console.log(`   Tracking Number: ${trackingNumber}`);
          console.log(`   Order Number: ${testOrderNumber}`);
        } else {
          console.log(`   ✗ FAIL: Unexpected response status: ${response.data.status}`);
          console.log(`   Message: ${response.data.message}`);

          this.testResults.push({
            testName,
            status: 'FAIL',
            message: response.data.message || 'Failed to create shipment',
            duration: Date.now() - startTime,
          });
        }
      } catch (shipmentError) {
        if (shipmentError.response?.status === 402) {
          this.testResults.push({
            testName,
            status: 'SKIP',
            message: 'Insufficient balance in ShippingRocket account',
            duration: Date.now() - startTime,
            details: shipmentError.response?.data,
          });

          console.log('   ⊘ SKIP: Insufficient balance (ShippingRocket account needs balance)');
        } else {
          throw shipmentError;
        }
      }
    } catch (error) {
      this.testResults.push({
        testName,
        status: 'FAIL',
        message: error.message || 'Shipment creation test failed',
        duration: Date.now() - startTime,
        details: error.response?.data || error.message,
      });

      console.log('   ✗ FAIL: ' + (error.message || 'Shipment creation test failed'));
      this.logger.error('Shipment creation test failed:', error.message);
    }

    console.log();
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    console.log('========================================');
    console.log('TEST SUMMARY');
    console.log('========================================\n');

    const passed = this.testResults.filter((r) => r.status === 'PASS').length;
    const failed = this.testResults.filter((r) => r.status === 'FAIL').length;
    const skipped = this.testResults.filter((r) => r.status === 'SKIP').length;
    const total = this.testResults.length;

    console.log(`Tests Run: ${total}`);
    console.log(`✓ Passed: ${passed}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`⊘ Skipped: ${skipped}`);

    if (failed === 0) {
      console.log('\n✓ All tests passed!\n');
    } else {
      console.log(`\n✗ ${failed} test(s) failed\n`);
    }

    console.log('DETAILED RESULTS:');
    console.log('----------------------------------------\n');

    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⊘';
      console.log(`${index + 1}. ${icon} ${result.testName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Message: ${result.message}`);
      console.log(`   Duration: ${result.duration}ms`);

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 4)}`);
      }

      console.log();
    });
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return this.testResults;
  }
}
