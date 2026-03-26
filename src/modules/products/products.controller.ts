import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  ProductQueryDto,
  CreateProductWithVariantsDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products with filters' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  async getFeatured(@Query('limit') limit = 10) {
    return this.productsService.getFeaturedProducts(+limit);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get all brands' })
  async getBrands() {
    return this.productsService.getAllBrands();
  }

  @Get('search/:query')
  @ApiOperation({ summary: 'Global search products and categories' })
  async globalSearch(@Param('query') query: string) {
    return this.productsService.globalSearch(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  async getRelated(@Param('id') id: string, @Query('limit') limit = 10) {
    return this.productsService.getRelatedProducts(id, +limit);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get all variants for a product' })
  async getProductVariants(@Param('id') id: string) {
    return this.productsService.getProductVariants(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Admin only)' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('with-variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product with variants in single transaction (Admin only)' })
  async createWithVariants(@Body() createProductDto: CreateProductWithVariantsDto) {
    return this.productsService.createWithVariants(createProductDto);
  }

  @Post('variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product variant (Admin only)' })
  async createVariant(@Body() createVariantDto: CreateProductVariantDto) {
    return this.productsService.createVariant(createVariantDto);
  }

  @Post('variants/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create multiple product variants (Admin only)' })
  async createVariantsBulk(@Body() body: { variants: CreateProductVariantDto[] }) {
    return this.productsService.createVariantsBulk(body.variants);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Put('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product variant (Admin only)' })
  async updateVariant(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(id, updateVariantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Delete('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product variant (Admin only)' })
  async removeVariant(@Param('id') id: string) {
    return this.productsService.removeVariant(id);
  }

  @Put('variants/:id/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update variant inventory (Admin only)' })
  async updateVariantInventory(
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ) {
    return this.productsService.updateVariantInventory(id, body.quantity);
  }
}
