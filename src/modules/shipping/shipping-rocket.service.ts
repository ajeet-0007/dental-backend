import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CalculateRateDto } from './dto/calculate-rate.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';

interface ShippingRocketCourier {
  id: number;
  name: string;
  service_type: string;
  rate: number;
  cod_charge: number;
  days: number;
  is_available: boolean;
}

interface ShippingRocketRateResponse {
  status: string;
  data: {
    available_couriers: ShippingRocketCourier[];
  };
  message?: string;
}

interface ShippingRocketShipmentResponse {
  status: string;
  data: {
    shipment_id: number;
    order_id: string;
    tracking_number: string;
    label_url: string;
    awb_number: string;
    courier_name: string;
  };
  message?: string;
}

interface ShippingRocketAuthResponse {
  status: number;
  data: {
    token: string;
  };
  message?: string;
}

@Injectable()
export class ShippingRocketService implements OnModuleInit {
  private axiosInstance: AxiosInstance;
  private readonly logger = new Logger(ShippingRocketService.name);
  private apiEmail: string;
  private apiPassword: string;
  private apiUrl: string;
  private warehousePincode: string;
  private warehouseCity: string;
  private warehouseState: string;
  private warehouseAddress: string;
  private warehousePhone: string;
  private warehouseEmail: string;
  private pickupLocationName: string;
  private bearerToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(private configService: ConfigService) {
    this.apiEmail = this.configService.get<string>('SHIPPINGROCKET_API_USER') || '';
    this.apiPassword = this.configService.get<string>('SHIPPINGROCKET_API_PASSWORD') || '';
    this.apiUrl = this.configService.get<string>('SHIPPINGROCKET_API_URL') || '';
    this.warehousePincode = this.configService.get<string>('WAREHOUSE_PINCODE') || '';
    this.warehouseCity = this.configService.get<string>('WAREHOUSE_CITY') || 'Bareilly';
    this.warehouseState = this.configService.get<string>('WAREHOUSE_STATE') || 'Uttar Pradesh';
    this.warehouseAddress = this.configService.get<string>('WAREHOUSE_ADDRESS_LINE1') || 'Warehouse Address';
    this.warehousePhone = this.configService.get<string>('WAREHOUSE_PHONE') || '9999999999';
    this.warehouseEmail = this.configService.get<string>('WAREHOUSE_EMAIL') || 'warehouse@dentalkart.com';
    this.pickupLocationName = this.configService.get<string>('SHIPPINGROCKET_PICKUP_LOCATION') || 'Dentalkart Warehouse';

    this.logger.log(`ShipRocket Config - Email: ${this.apiEmail}, URL: ${this.apiUrl}, Warehouse: ${this.warehousePincode}, Pickup Location: ${this.pickupLocationName}`);

    if (!this.apiEmail || !this.apiPassword || !this.apiUrl || !this.warehousePincode) {
      this.logger.error('ShippingRocket configuration incomplete - missing required config');
      return;
    }

    // Create axios instance without auth initially
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('ShippingRocket API Error:', error.response?.data || error.message);
        throw error;
      },
    );
  }

  /**
   * Initialize authentication on module start
   */
  async onModuleInit() {
    try {
      await this.authenticateAndRefreshToken();
      await this.ensurePickupLocationExists();
    } catch (error) {
      this.logger.error('Failed to initialize ShippingRocket:', error);
    }
  }

  /**
   * Ensure pickup location exists, create if not
   */
  private async ensurePickupLocationExists(): Promise<void> {
    try {
      const locations = await this.getPickupLocations();
      const existingLocation = locations.find(
        (loc: any) => loc.pickup_location?.toLowerCase() === this.pickupLocationName.toLowerCase()
      );

      if (existingLocation) {
        this.logger.log(`Pickup location '${this.pickupLocationName}' already exists`);
        return;
      }

      await this.createPickupLocation();
    } catch (error) {
      this.logger.error('Failed to ensure pickup location:', error);
    }
  }

  /**
   * Get all pickup locations
   */
  async getPickupLocations(): Promise<any[]> {
    try {
      await this.ensureValidToken();
      const response = await this.axiosInstance.get('/settings/company/pickup');
      
      if (response.data.status === 200 || response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      this.logger.error('Error fetching pickup locations:', error);
      return [];
    }
  }

  /**
   * Create a new pickup location
   */
  async createPickupLocation(): Promise<any> {
    try {
      await this.ensureValidToken();

      const payload = {
        pickup_location: this.pickupLocationName,
        name: this.pickupLocationName,
        email: this.warehouseEmail,
        phone: parseInt(this.warehousePhone.replace(/\D/g, '')),
        address: this.warehouseAddress,
        city: this.warehouseCity,
        state: this.warehouseState,
        pin_code: parseInt(this.warehousePincode),
        country: 'India',
      };

      this.logger.log('Creating pickup location with payload:', JSON.stringify(payload));

      const response = await this.axiosInstance.post('/settings/company/addpickup', payload);

      if (response.data.status === 200 || response.data.status === 'success') {
        this.logger.log(`Pickup location '${this.pickupLocationName}' created successfully`);
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to create pickup location');
    } catch (error) {
      this.logger.error('Error creating pickup location:', error);
      throw error;
    }
  }

  /**
   * Authenticate and get bearer token
   * Returns true if authenticated, false otherwise
   */
  private async authenticateAndRefreshToken(): Promise<boolean> {
    try {
      this.logger.log('Attempting ShippingRocket authentication...');
      this.logger.log(`Email: ${this.apiEmail}, Password length: ${this.apiPassword?.length}`);
      
      const response = await axios.post(
        `https://apiv2.shiprocket.in/v1/external/auth/login`,
        {
          email: this.apiEmail,
          password: this.apiPassword,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        },
      );

      this.logger.log('Auth response:', JSON.stringify(response.data));

      // ShipRocket returns token directly in response.data
      if (response.data.token) {
        this.bearerToken = response.data.token;
        this.tokenExpiryTime = Date.now() + 23 * 60 * 60 * 1000;
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.bearerToken}`;
        this.logger.log('Successfully authenticated with ShippingRocket');
        return true;
      } else if (response.data.data?.token) {
        this.bearerToken = response.data.data.token;
        this.tokenExpiryTime = Date.now() + 23 * 60 * 60 * 1000;
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.bearerToken}`;
        this.logger.log('Successfully authenticated with ShippingRocket');
        return true;
      }
      this.logger.error('No token found in auth response');
      return false;
    } catch (error) {
      this.logger.error('ShippingRocket authentication failed:', error.message);
      if (error.response) {
        this.logger.error('Response data:', JSON.stringify(error.response.data));
      }
      return false;
    }
  }

  /**
   * Ensure token is valid, refresh if needed
   * Returns true if authenticated, false otherwise
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.bearerToken || Date.now() >= this.tokenExpiryTime) {
      return await this.authenticateAndRefreshToken();
    }
    return true;
  }

  /**
   * Calculate shipping rates for available couriers
   */
  async calculateRates(rateDto: CalculateRateDto) {
    const authenticated = await this.ensureValidToken();
    
    if (!authenticated) {
      throw new HttpException(
        'Unable to connect to shipping provider. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const params = {
      pickup_postcode: parseInt(rateDto.pickupPincode),
      delivery_postcode: parseInt(rateDto.deliveryPincode),
      weight: parseFloat(rateDto.weight.toString()),
      length: parseInt(rateDto.length.toString()),
      breadth: parseInt(rateDto.breadth.toString()),
      height: parseInt(rateDto.height.toString()),
      cod: 0,
    };

    try {
      const response = await this.axiosInstance.get(
        '/courier/serviceability',
        { params },
      );

      this.logger.log('Rate response status: ' + response.data.status);
      this.logger.log('Rate response data: ' + JSON.stringify(response.data).substring(0, 500));

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to calculate rates',
          HttpStatus.BAD_REQUEST,
        );
      }

      const availableCouriers = response.data.data.available_courier_companies || response.data.data.available_couriers || [];
      
      const couriers = availableCouriers.map((courier: any) => ({
        id: courier.id?.toString() || courier.courier_company_id?.toString(),
        name: courier.courier_name,
        serviceType: courier.courier_type,
        rate: courier.rate || courier.freight_charge,
        codCharge: courier.cod_charges || 0,
        totalCost: (courier.rate || courier.freight_charge) + (courier.cod_charges || 0),
        estimatedDays: courier.estimated_delivery_days || courier.api_edd || 1,
        estimatedDelivery: courier.etd || new Date().toISOString().split('T')[0],
        availability: courier.blocked === 0 ? 'available' : 'unavailable',
      }));

      return { couriers };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error calculating rates:', error.message);
      throw new HttpException(
        'Failed to calculate shipping rates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

/**
   * Create a shipment with ShippingRocket
   */
  async createShipment(shipmentDto: CreateShipmentDto, order: any) {
    const authenticated = await this.ensureValidToken();
    
    if (!authenticated) {
      throw new HttpException(
        'Unable to connect to shipping provider. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Parse shipping address if it's still a JSON string
    let shippingAddress = order.shippingAddress;
    if (typeof order.shippingAddress === 'string') {
      try {
        shippingAddress = JSON.parse(order.shippingAddress);
      } catch {
        shippingAddress = {};
      }
    }

     // Validate required address fields
    const validationErrors: string[] = [];
    let phone = shippingAddress?.phone || shippingAddress?.mobile || order.phone || order.shippingPhone || '';
    const pincode = shippingAddress?.pincode || shipmentDto.deliveryPincode || '';
    const city = shippingAddress?.city || '';
    const state = shippingAddress?.state || '';
    const address = shippingAddress?.addressLine1 || shippingAddress?.address1 || shippingAddress?.address || '';

    // Normalize phone number: remove country code and non-digits
    const phoneDigits = phone.toString().replace(/[^\d]/g, '');
    let normalizedPhone = phoneDigits;
    
    // If phone has 12 digits starting with 91 (India country code), remove it
    if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
      normalizedPhone = phoneDigits.substring(2); // Remove country code
    }

    if (!phone || phone.toString().trim() === '') {
      validationErrors.push('Phone number is required');
    } else if (!/^\d{10}$/.test(normalizedPhone)) {
      validationErrors.push('Phone number must be 10 digits (with or without +91 country code)');
    }

    if (!pincode || pincode.toString().trim() === '') {
      validationErrors.push('Pincode is required');
    } else if (!/^\d{6}$/.test(pincode.toString())) {
      validationErrors.push('Pincode must be 6 digits');
    }

    if (!city || city.toString().trim() === '') {
      validationErrors.push('City is required');
    }

    if (!state || state.toString().trim() === '') {
      validationErrors.push('State is required');
    }

    if (!address || address.toString().trim() === '') {
      validationErrors.push('Address is required');
    }

    if (validationErrors.length > 0) {
      throw new HttpException(
        `Invalid shipping address: ${validationErrors.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Use normalized phone (10 digits without country code)
    phone = normalizedPhone;



    // Calculate sub_total from items
    const items = order.items || [];
    const subTotal = items.reduce((sum: number, item: any) => {
      return sum + ((item.sellingPrice || 0) * (item.quantity || 1));
    }, 0);

    const payload = {
      order_id: order.id,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: this.pickupLocationName,
      comment: '',
      billing_customer_name: shippingAddress?.firstName || shippingAddress?.name || shippingAddress?.lastName || 'Customer',
      billing_last_name: shippingAddress?.lastName || '',
      billing_company_name: '',
      billing_email: order.user?.email || '',
      billing_phone: phone,
      billing_address: address,
      billing_address_2: shippingAddress?.addressLine2 || shippingAddress?.address2 || '',
      billing_city: city,
      billing_state: state,
      billing_country: shippingAddress?.country || 'India',
      billing_pincode: parseInt(pincode),
      shipping_is_billing: true,
      shipping_customer_name: shippingAddress?.firstName || shippingAddress?.name || shippingAddress?.lastName || 'Customer',
      shipping_last_name: shippingAddress?.lastName || '',
      shipping_company_name: '',
      shipping_email: order.user?.email || '',
      shipping_mobile: phone,
      shipping_address: address,
      shipping_address_2: shippingAddress?.addressLine2 || shippingAddress?.address2 || '',
      shipping_city: city,
      shipping_state: state,
      shipping_country: shippingAddress?.country || 'India',
      shipping_pincode: parseInt(pincode),
      payment_method: shipmentDto.isCOD ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_msm_value: subTotal,
      sub_total: subTotal,
      courier_type: shipmentDto.selectedService,
      weight: shipmentDto.weight,
      length: shipmentDto.length,
      breadth: shipmentDto.breadth,
      height: shipmentDto.height,
      order_items: items.map((item: any) => ({
        name: item.productName || item.product?.name || 'Product',
        sku: item.sku || item.product?.sku || '',
        units: item.quantity || 1,
        selling_price: item.sellingPrice || 0,
        product_variant_id: item.productVariantId || item.productVariant?.id || '',
      })) || [],
    };

    this.logger.log('Creating shipment with payload:', JSON.stringify(payload).substring(0, 500));

    try {
      const response = await this.axiosInstance.post('/orders/create/adhoc', payload);
      console.log('Create shipment response status: ' + response.data.status);

      const shipmentData = response.data;
      console.log(shipmentData);

      return {
        shippingRocketId: shipmentData.shipment_id?.toString() || '',
        orderId: shipmentData.order_id?.toString() || order.id,
        srOrderId: shipmentData.order_id?.toString() || '',
        trackingNumber: shipmentData.tracking_number || '',
        awbNumber: shipmentData.awb_number || '',
        labelUrl: shipmentData.label_url || '',
        courierName: shipmentData.courier_name || '',
        status: shipmentData.status || 'created',
      };
    } catch (error) {
      this.logger.error('Error creating shipment:', error);
      
      // Extract actual error message from ShippingRocket API response
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to create shipment';
      
      throw new HttpException(
        `Failed to create shipment: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
}
  }

/**
   * Generate shipping label (PDF) using ShipRocket API v2
   */
  async generateLabel(shippingRocketId: string) {
    try {
      await this.ensureValidToken();

      this.logger.log(`Generating label for shipment: ${shippingRocketId}`);

      const response = await this.axiosInstance.post(
        '/courier/generate/label',
        { shipment_id: [parseInt(shippingRocketId)] },
        {
          responseType: 'arraybuffer',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error generating label:', error);
      throw new HttpException(
        'Failed to generate shipping label',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate labels in bulk
   */
  async generateBulkLabels(shipmentIds: string[]) {
    try {
      await this.ensureValidToken();

      this.logger.log(`Generating bulk labels for ${shipmentIds.length} shipments`);

      const response = await this.axiosInstance.post(
        '/courier/generate/label',
        { shipment_id: shipmentIds.map(id => parseInt(id)) },
        {
          responseType: 'arraybuffer',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error generating bulk labels:', error);
      throw new HttpException(
        'Failed to generate bulk labels',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

/**
   * Cancel shipment before pickup
   */
  async cancelShipment(orderId: string) {
    try {
      await this.ensureValidToken();

      console.log('[ShipRocket] Cancelling with orderId:', orderId);

      const response = await this.axiosInstance.post('/orders/cancel', {
        ids: [orderId],
      });

      return { success: true, message: 'Shipment cancelled successfully' };
    } catch (error) {
      this.logger.error('Error cancelling shipment:', error);
      throw new HttpException(
        'Failed to cancel shipment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

/**
    * Schedule pickup for shipments
    */
  async schedulePickup(shipmentIds: number[], pickupDate: Date) {
    try {
      await this.ensureValidToken();

      const payload = {
        shipment_ids: shipmentIds,
        scheduled_date: pickupDate.toISOString().split('T')[0],
      };

      const response = await this.axiosInstance.post('/pickups/schedule', payload);

      if (response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to schedule pickup',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        pickupId: response.data.data.pickup_id,
        scheduledDate: response.data.data.scheduled_date,
      };
    } catch (error) {
      this.logger.error('Error scheduling pickup:', error);
      throw new HttpException(
        'Failed to schedule pickup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const webhookSecret = this.configService.get<string>('SHIPPINGROCKET_WEBHOOK_SECRET');

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Helper: Add days to date
   */
  private addDaysToDate(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get tracking information for a shipment
   */
  async getShipmentTracking(trackingNumber: string) {
    try {
      await this.ensureValidToken();

      const response = await this.axiosInstance.get(`/courier/track/awb/${trackingNumber}`);

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to get tracking information',
          HttpStatus.BAD_REQUEST,
        );
      }

      const trackingData = response.data.data;
      
      return {
        trackingNumber: trackingNumber,
        courierName: trackingData.courier_name,
        currentStatus: trackingData.current_status,
        status: trackingData.delivery_status,
        estimatedDelivery: trackingData.etd,
        trackingUrl: trackingData.tracking_url,
        shipmentTrack: trackingData.shipment_track || [],
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error getting tracking:', error.message);
      throw new HttpException(
        'Failed to get tracking information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get NDR (Non-Delivery Report) shipments
   */
  async getNDRShipments(): Promise<any> {
    try {
      await this.ensureValidToken();

      const response = await this.axiosInstance.get('/ndr/list');

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to fetch NDR shipments',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        data: response.data.data || [],
        message: response.data.message,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching NDR shipments:', error.message);
      throw new HttpException(
        'Failed to fetch NDR shipments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retry NDR delivery (attempt delivery again)
   */
  async retryNDRDelivery(shippingRocketId: string): Promise<any> {
    try {
      await this.ensureValidToken();

      const payload = {
        shipment_id: parseInt(shippingRocketId),
      };

      const response = await this.axiosInstance.post('/ndr/retry', payload);

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to retry NDR delivery',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        shipmentId: shippingRocketId,
        message: response.data.message || 'NDR retry scheduled successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error retrying NDR delivery:', error.message);
      throw new HttpException(
        'Failed to retry NDR delivery',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reschedule NDR delivery (change delivery date)
   */
  async rescheduleNDRDelivery(shippingRocketId: string, newDeliveryDate: Date): Promise<any> {
    try {
      await this.ensureValidToken();

      const payload = {
        shipment_id: parseInt(shippingRocketId),
        scheduled_date: newDeliveryDate.toISOString().split('T')[0],
      };

      const response = await this.axiosInstance.post('/ndr/reschedule', payload);

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to reschedule NDR delivery',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        shipmentId: shippingRocketId,
        scheduledDate: newDeliveryDate.toISOString().split('T')[0],
        message: response.data.message || 'NDR rescheduled successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error rescheduling NDR delivery:', error.message);
      throw new HttpException(
        'Failed to reschedule NDR delivery',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a return shipment
   */
  async createReturnShipment(originalShipmentId: string, returnAddress?: any): Promise<any> {
    try {
      await this.ensureValidToken();

      const payload = {
        shipment_id: parseInt(originalShipmentId),
        return_address: returnAddress || undefined,
      };

      const response = await this.axiosInstance.post('/orders/create/return', payload);

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to create return shipment',
          HttpStatus.BAD_REQUEST,
        );
      }

      const shipmentData = response.data.data;
      return {
        success: true,
        returnShipmentId: shipmentData.shipment_id?.toString() || '',
        orderId: shipmentData.order_id?.toString() || '',
        trackingNumber: shipmentData.tracking_number || '',
        awbNumber: shipmentData.awb_number || '',
        courierName: shipmentData.courier_name || '',
        labelUrl: shipmentData.label_url || '',
        message: response.data.message || 'Return shipment created successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error creating return shipment:', error.message);
      throw new HttpException(
        'Failed to create return shipment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assign AWB directly to a shipment (without creating order)
   */
  async assignAWB(shippingRocketId: string, courierCompanyId: number): Promise<any> {
    try {
      await this.ensureValidToken();

      const payload = {
        shipment_id: parseInt(shippingRocketId),
        courier_company_id: courierCompanyId,
      };

      const response = await this.axiosInstance.post('/shipments/awb', payload);

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to assign AWB',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        shipmentId: shippingRocketId,
        awbNumber: response.data.data.awb_number || '',
        courierName: response.data.data.courier_name || '',
        message: response.data.message || 'AWB assigned successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error assigning AWB:', error.message);
      throw new HttpException(
        'Failed to assign AWB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel pickup by pickup ID
   */
  async cancelPickupById(pickupId: string): Promise<any> {
    try {
      await this.ensureValidToken();

      const payload = {
        pickup_id: parseInt(pickupId),
      };

      const response = await this.axiosInstance.post('/pickups/cancel', payload);

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to cancel pickup',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        pickupId: pickupId,
        message: response.data.message || 'Pickup cancelled successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error cancelling pickup:', error.message);
      throw new HttpException(
        'Failed to cancel pickup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate manifest using ShipRocket API v2
   */
  async generateManifest(shippingRocketId: string): Promise<any> {
    try {
      await this.ensureValidToken();

      this.logger.log(`Generating manifest for shipment: ${shippingRocketId}`);

      const response = await this.axiosInstance.post(
        '/courier/generate/manifest',
        { shipment_id: [parseInt(shippingRocketId)] },
        {
          responseType: 'arraybuffer',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error generating manifest:', error);
      throw new HttpException(
        'Failed to generate manifest',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateBulkManifests(shipmentIds: string[]): Promise<any> {
    try {
      await this.ensureValidToken();

      this.logger.log(`Generating bulk manifests for ${shipmentIds.length} shipments`);

      const response = await this.axiosInstance.post(
        '/courier/generate/manifest',
        { shipment_id: shipmentIds.map(id => parseInt(id)) },
        {
          responseType: 'arraybuffer',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error generating bulk manifests:', error);
      throw new HttpException(
        'Failed to generate bulk manifests',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate invoice using ShipRocket API v2
   */
  async generateInvoice(shippingRocketId: string): Promise<any> {
    try {
      await this.ensureValidToken();

      this.logger.log(`Generating invoice for shipment: ${shippingRocketId}`);

      const response = await this.axiosInstance.post(
        '/orders/printinvoice',
        { order_id: [parseInt(shippingRocketId)] },
        {
          responseType: 'arraybuffer',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error generating invoice:', error);
      throw new HttpException(
        'Failed to generate invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateBulkInvoices(shipmentIds: string[]): Promise<any> {
    try {
      await this.ensureValidToken();

      this.logger.log(`Generating bulk invoices for ${shipmentIds.length} shipments`);

      const response = await this.axiosInstance.post(
        '/orders/printinvoice',
        { order_id: shipmentIds.map(id => parseInt(id)) },
        {
          responseType: 'arraybuffer',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error generating bulk invoices:', error);
      throw new HttpException(
        'Failed to generate bulk invoices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCourierCompanies(): Promise<any> {
    try {
      await this.ensureValidToken();

      const response = await this.axiosInstance.get('/courier/list');

      if (response.data.status !== 200 && response.data.status !== 'success') {
        throw new HttpException(
          response.data.message || 'Failed to fetch courier companies',
          HttpStatus.BAD_REQUEST,
        );

      }

      return {
        data: response.data.data || [],
        message: response.data.message,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching courier companies:', error.message);
      throw new HttpException(
        'Failed to fetch courier companies',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
