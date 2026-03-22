"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const shipping_service_1 = require("./shipping.service");
const shipping_dto_1 = require("./dto/shipping.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const entities_1 = require("../../database/entities");
let ShippingController = class ShippingController {
    constructor(shippingService) {
        this.shippingService = shippingService;
    }
    async getAllShippingMethods() {
        return this.shippingService.getAllShippingMethods();
    }
    async calculateShippingCost(subtotal, weight = 0) {
        return this.shippingService.calculateShippingCost(+subtotal, +weight);
    }
    async getShippingMethodById(id) {
        return this.shippingService.getShippingMethodById(id);
    }
    async getShipmentByOrder(orderId) {
        return this.shippingService.getShipmentByOrder(orderId);
    }
    async createShippingMethod(createShippingMethodDto) {
        return this.shippingService.createShippingMethod(createShippingMethodDto);
    }
    async updateShippingMethod(id, updateShippingMethodDto) {
        return this.shippingService.updateShippingMethod(id, updateShippingMethodDto);
    }
    async deleteShippingMethod(id) {
        return this.shippingService.deleteShippingMethod(id);
    }
    async updateShipment(id, updateShipmentDto) {
        return this.shippingService.updateShipment(id, updateShipmentDto);
    }
};
exports.ShippingController = ShippingController;
__decorate([
    (0, common_1.Get)('methods'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all shipping methods' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getAllShippingMethods", null);
__decorate([
    (0, common_1.Get)('calculate'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate shipping cost' }),
    __param(0, (0, common_1.Query)('subtotal')),
    __param(1, (0, common_1.Query)('weight')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "calculateShippingCost", null);
__decorate([
    (0, common_1.Get)('methods/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get shipping method by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getShippingMethodById", null);
__decorate([
    (0, common_1.Get)('order/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get shipment by order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getShipmentByOrder", null);
__decorate([
    (0, common_1.Post)('methods'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(entities_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create shipping method (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shipping_dto_1.CreateShippingMethodDto]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "createShippingMethod", null);
__decorate([
    (0, common_1.Put)('methods/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(entities_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update shipping method (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_dto_1.UpdateShippingMethodDto]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updateShippingMethod", null);
__decorate([
    (0, common_1.Delete)('methods/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(entities_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete shipping method (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "deleteShippingMethod", null);
__decorate([
    (0, common_1.Put)('shipments/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(entities_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update shipment (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shipping_dto_1.UpdateShipmentDto]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updateShipment", null);
exports.ShippingController = ShippingController = __decorate([
    (0, swagger_1.ApiTags)('Shipping'),
    (0, common_1.Controller)('shipping'),
    __metadata("design:paramtypes", [shipping_service_1.ShippingService])
], ShippingController);
//# sourceMappingURL=shipping.controller.js.map