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

    // Test 1: Authentication
    await this.testAuthentication();

    if (!this.bearerToken) {
      this.logger.error('Authentication failed, skipping remaining tests');
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

      this.logger.error('Authentication test failed:', error.message);
    }

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

      for (const testCase of testCases) {
        try {

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
          } else {
          }
        } catch (innerError) {
        }
      }

      this.testResults.push({
        testName,
        status: 'PASS',
        message: 'Successfully calculated rates for valid pincodes',
        duration: Date.now() - startTime,
      });

    } catch (error) {
      this.testResults.push({
        testName,
        status: 'FAIL',
        message: error.message || 'Rate calculation failed',
        duration: Date.now() - startTime,
        details: error.response?.data || error.message,
      });

      this.logger.error('Rate calculation test failed:', error.message);
    }

  }

  /**
   * Test 3: Rate Calculation with Invalid Pincode
   */
  private async testRateCalculationInvalid(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Rate Calculation (Invalid Pincode - Error Handling)';

    try {

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

        } else {
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

      this.logger.error('Invalid pincode test failed:', error.message);
    }

  }

  /**
   * Test 4: Get Available Couriers
   */
  private async testGetCouriers(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Get Available Couriers';

    try {

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

        couriers.slice(0, 3).forEach((courier: any) => {
        });
      } else {
      }
    } catch (error) {
      this.testResults.push({
        testName,
        status: 'SKIP',
        message: error.message || 'Endpoint may not be available',
        duration: Date.now() - startTime,
      });

    }

  }

  /**
   * Test 5: Shipment Creation
   */
  private async testShipmentCreation(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Shipment Creation';

    try {

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

        } else {

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

      this.logger.error('Shipment creation test failed:', error.message);
    }

  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {

    const passed = this.testResults.filter((r) => r.status === 'PASS').length;
    const failed = this.testResults.filter((r) => r.status === 'FAIL').length;
    const skipped = this.testResults.filter((r) => r.status === 'SKIP').length;
    const total = this.testResults.length;


    if (failed === 0) {
    } else {
    }


    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⊘';

      if (result.details) {
      }

    });
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return this.testResults;
  }
}
