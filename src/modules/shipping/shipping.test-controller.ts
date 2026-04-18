import { Controller, Post, Get } from '@nestjs/common';
import { ShippingRocketTestService } from './shipping.test-service';

@Controller('api/test/shipping')
export class ShippingTestController {
  constructor(private readonly testService: ShippingRocketTestService) {}

  @Post('run-all')
  async runAllTests(): Promise<any> {
    const results = await this.testService.runAllTests();
    return {
      success: true,
      message: 'Tests completed',
      results,
    };
  }

  @Get('results')
  async getResults(): Promise<any> {
    const results = this.testService.getTestResults();
    return {
      success: true,
      results,
    };
  }
}
