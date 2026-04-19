import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { Order, OrderStatus } from "../../database/entities/order.entity";
import { Payment } from "../../database/entities/payment.entity";
import { Product } from "../../database/entities/product.entity";
import { User, UserRole } from "../../database/entities/user.entity";
import { OrderItem } from "../../database/entities/order-item.entity";
import { Inventory } from "../../database/entities/inventory.entity";
import { Category } from "../../database/entities/category.entity";
import { ProductOption } from "../../database/entities/product-option.entity";
import { ProductOptionValue } from "../../database/entities/product-option-value.entity";
import { Department } from "../../database/entities/department.entity";
import { Brand, Shipment, ShipmentStatus } from "../../database/entities";
import { ShippingRocketService } from "../shipping/shipping-rocket.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductOption)
    private productOptionRepository: Repository<ProductOption>,
    @InjectRepository(ProductOptionValue)
    private productOptionValueRepository: Repository<ProductOptionValue>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    private shippingRocketService: ShippingRocketService,
    private dataSource: DataSource,
  ) {}

  async getDashboardStats() {
    const [
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      pendingOrders,
      completedOrders,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      this.orderRepository.count(),
      this.productRepository.count(),
      this.userRepository.count({ where: { role: UserRole.USER } }),
      this.paymentRepository
        .createQueryBuilder("payment")
        .select("SUM(payment.amount)", "total")
        .where("payment.status = :status", { status: "completed" })
        .getRawOne(),
      this.orderRepository.count({
        where: { status: OrderStatus.PENDING_PAYMENT },
      }),
      this.orderRepository.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.orderRepository.find({
        order: { createdAt: "DESC" },
        take: 10,
        relations: ["user", "items"],
      }),
      this.getTopSellingProducts(),
    ]);

    const ordersByStatus = await this.orderRepository
      .createQueryBuilder("order")
      .select("order.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("order.status")
      .getRawMany();

    const monthlyRevenue = await this.getMonthlyRevenue();

    return {
      totalOrders,
      totalProducts,
      totalCustomers: totalUsers,
      totalRevenue: parseFloat(totalRevenue?.total || "0"),
      pendingOrders,
      completedOrders,
      recentOrders,
      topProducts,
      ordersByStatus,
      monthlyRevenue,
    };
  }

  private async getTopSellingProducts(limit = 5) {
    return this.orderItemRepository
      .createQueryBuilder("item")
      .select("item.productId", "productId")
      .addSelect("item.productName", "productName")
      .addSelect("SUM(item.quantity)", "totalSold")
      .groupBy("item.productId")
      .addGroupBy("item.productName")
      .orderBy("totalSold", "DESC")
      .limit(limit)
      .getRawMany();
  }

  private async getMonthlyRevenue() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.paymentRepository
      .createQueryBuilder("payment")
      .select("MONTH(payment.createdAt)", "month")
      .addSelect("YEAR(payment.createdAt)", "year")
      .addSelect("SUM(payment.amount)", "revenue")
      .where("payment.status = :status", { status: "completed" })
      .andWhere("payment.createdAt >= :date", { date: sixMonthsAgo })
      .groupBy("MONTH(payment.createdAt)")
      .addGroupBy("YEAR(payment.createdAt)")
      .orderBy("year", "ASC")
      .addOrderBy("month", "ASC")
      .getRawMany();
  }

  async getAllOrders(page = 1, limit = 20, status?: string, search?: string) {
    const query = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("order.payments", "payments")
      .orderBy("order.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere("order.status = :status", { status });
    }

    if (search) {
      query.andWhere(
        "(order.orderNumber LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)",
        { search: `%${search}%` },
      );
    }

    const [orders, total] = await query.getManyAndCount();

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = status as any;
    await this.orderRepository.save(order);

    return { success: true, order };
  }

  async getAllUsers(page = 1, limit = 20) {
    const [users, total] = await this.userRepository.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        "id",
        "email",
        "firstName",
        "lastName",
        "phone",
        "role",
        "isActive",
        "createdAt",
      ],
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    return { success: true, user };
  }

  async getAllProducts(
    page = 1,
    limit = 20,
    search?: string,
    categoryId?: number,
  ) {
    const query = this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.brandEntity", "brandEntity")
      .leftJoinAndSelect("product.departments", "departments")
      .leftJoinAndSelect("product.options", "options")
      .leftJoinAndSelect("options.values", "optionValues")
      .leftJoinAndSelect("product.variants", "variants")
      .orderBy("product.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        "(product.name LIKE :search OR product.sku LIKE :search)",
        {
          search: `%${search}%`,
        },
      );
    }

    if (categoryId) {
      query.andWhere("product.categoryId = :categoryId", { categoryId });
    }

    const [products, total] = await query.getManyAndCount();

    const enrichedProducts = products.map((product: any) => {
      const variants = product.variants || [];
      const variantCount = variants.length;
      
      let minVariantPrice = 0;
      let maxVariantPrice = 0;
      let variantPriceRange = "";

      if (variantCount > 0) {
        const prices = variants
          .map((v: any) => v.sellingPrice)
          .filter((p: number) => p > 0);
        
        if (prices.length > 0) {
          minVariantPrice = Math.min(...prices);
          maxVariantPrice = Math.max(...prices);
          
          if (minVariantPrice === maxVariantPrice) {
            variantPriceRange = `₹${minVariantPrice}`;
          } else {
            variantPriceRange = `₹${minVariantPrice} - ₹${maxVariantPrice}`;
          }
        }
      }

      return {
        ...product,
        variantCount,
        minVariantPrice,
        maxVariantPrice,
        variantPriceRange,
      };
    });

    return {
      products: enrichedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createProduct(productData: any) {
    if (!productData.slug && productData.name) {
      let baseSlug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      let slug = baseSlug;
      let counter = 1;
      while (await this.productRepository.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      productData.slug = slug;
    }

    const { departmentIds, ...restData } = productData;

    if (restData.brandId && !restData.brand) {
      const brand = await this.brandRepository.findOne({
        where: { id: restData.brandId },
      });
      if (brand) {
        restData.brand = brand.name;
      }
    }

    const product = this.productRepository.create(restData);
    const savedProduct = (await this.productRepository.save(product)) as unknown as Product;

    if (!savedProduct.hasVariants) {
      await this.inventoryRepository.save({
        productId: savedProduct.id,
        quantity: restData.stock || 0,
        warehouseLocation: "default",
      });
    }

    if (departmentIds && departmentIds.length > 0) {
      const departments = await this.departmentRepository.findBy({
        id: In(departmentIds),
      });
      savedProduct.departments = departments;
      await this.productRepository.save(savedProduct);
    }

    return savedProduct;
  }

  async updateProduct(productId: number, productData: any) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new Error("Product not found");
    }

    const { options, departmentIds, stock, ...restData } = productData;

    if (restData.brandId && !restData.brand) {
      const brand = await this.brandRepository.findOne({
        where: { id: restData.brandId },
      });
      if (brand) {
        restData.brand = brand.name;
      }
    }

    if (options !== undefined) {
      await this.updateProductOptions(productId, options);
      restData.hasVariants = options.length > 0;
    }

    Object.assign(product, restData);
    await this.productRepository.save(product);

    if (departmentIds !== undefined) {
      if (departmentIds && departmentIds.length > 0) {
        const departments = await this.departmentRepository.findBy({
          id: In(departmentIds),
        });
        product.departments = departments;
      } else {
        product.departments = [];
      }
      await this.productRepository.save(product);
    }

    if (stock !== undefined && stock !== null && !product.hasVariants) {
      await this.updateInventory(String(productId), stock);
    }

    const updatedProduct = await this.productRepository.findOne({
      where: { id: productId },
      relations: ["options", "options.values", "departments"],
    });

    return updatedProduct;
  }

  private async updateProductOptions(productId: number, options: any[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const numericProductId = Number(productId);
      
      const existingOptions = await this.productOptionRepository.find({
        where: { productId: numericProductId },
        relations: ['values'],
      });

      for (const existingOpt of existingOptions) {
        if (existingOpt.values) {
          await queryRunner.manager.remove(existingOpt.values);
        }
        await queryRunner.manager.remove(existingOpt);
      }

      for (let i = 0; i < options.length; i++) {
        const optData = options[i];
        
        await queryRunner.query(
          `INSERT INTO product_options (productId, name, position) VALUES (?, ?, ?)`,
          [numericProductId, optData.name, i]
        );
        
        const [insertResult] = await queryRunner.query('SELECT LAST_INSERT_ID() as id');
        const savedOptionId = insertResult.id;

        if (optData.values && optData.values.length > 0) {
          for (let j = 0; j < optData.values.length; j++) {
            const valData = optData.values[j];
            const value = valData.value || valData;
            const hexCode = valData.hexCode || null;
            const swatchUrl = valData.swatchUrl || null;
            
            await queryRunner.query(
              `INSERT INTO product_option_values (optionId, value, hexCode, swatchUrl, position) VALUES (?, ?, ?, ?, ?)`,
              [savedOptionId, value, hexCode, swatchUrl, j]
            );
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProduct(productId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new Error("Product not found");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(Inventory, { productId: String(productId) });
      await queryRunner.manager.remove(product);
      
      await queryRunner.commitTransaction();
      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getInventory(productId?: number, search?: string) {
    const query = this.inventoryRepository
      .createQueryBuilder("inventory")
      .leftJoinAndSelect("inventory.product", "product")
      .orderBy("inventory.quantity", "ASC");

    if (productId) {
      query.andWhere("inventory.productId = :productId", { productId: String(productId) });
    }

    if (search && search.trim()) {
      const searchNum = parseInt(search, 10);
      const isNumeric = !isNaN(searchNum);
      
      if (isNumeric) {
        query.andWhere("inventory.productId = :searchNum", { searchNum: String(searchNum) });
      } else {
        query.andWhere(
          "(product.name LIKE :search OR product.sku LIKE :search)",
          { search: `%${search}%` }
        );
      }
    }

    const inventory = await query.getMany();

    const lowStock = inventory.filter(
      (item) => item.quantity <= (item.lowStockThreshold || 10),
    );

    return {
      inventory,
      lowStock,
      totalProducts: inventory.length,
      lowStockCount: lowStock.length,
    };
  }

  async updateInventory(productId: string, quantity: number, variantId?: string) {
    const productIdNum = +productId;
    let inventory;

    if (variantId) {
      inventory = await this.inventoryRepository.findOne({
        where: { productId: productIdNum, productVariantId: variantId },
      });

      if (!inventory) {
        inventory = this.inventoryRepository.create({
          productId: productIdNum,
          productVariantId: variantId,
          quantity,
          lowStockThreshold: 10,
          warehouseLocation: "default",
        });
      } else {
        inventory.quantity = quantity;
      }
    } else {
      inventory = await this.inventoryRepository.findOne({
        where: { productId: productIdNum },
      });

      if (!inventory) {
        inventory = this.inventoryRepository.create({
          productId: productIdNum,
          quantity,
          lowStockThreshold: 10,
          warehouseLocation: "default",
        });
      } else {
        inventory.quantity = quantity;
      }
    }

    await this.inventoryRepository.save(inventory);
    return inventory;
  }

  async getAllCategories() {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: "ASC", name: "ASC" },
      select: ["id", "name", "slug", "parentId"],
    });

    return {
      categories: categories.map((c) => ({ ...c, id: c.id.toString() })),
    };
  }

  async createCategory(categoryData: {
    name: string;
    slug?: string;
    description?: string;
  }) {
    const slug =
      categoryData.slug ||
      categoryData.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const existingCategory = await this.categoryRepository.findOne({
      where: { slug },
    });
    if (existingCategory) {
      throw new Error("Category with this slug already exists");
    }

    const category = this.categoryRepository.create({
      name: categoryData.name,
      slug,
      description: categoryData.description,
    });

    await this.categoryRepository.save(category);
    return category;
  }

  async getAllPayments(page = 1, limit = 20, status?: string) {
    const query = this.paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.order", "order")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("payment.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.where("payment.status = :status", { status });
    }

    const [payments, total] = await query.getManyAndCount();

    const totalAmount = await this.paymentRepository
      .createQueryBuilder("payment")
      .select("SUM(payment.amount)", "total")
      .where(status ? "payment.status = :status" : "1=1", { status })
      .getRawOne();

    return {
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totalAmount: parseFloat(totalAmount?.total || "0"),
    };
  }

  async cancelOrderShipment(orderId: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['shipments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shipment = order.shipments?.[0];
    if (!shipment) {
      throw new NotFoundException('No shipment found for this order');
    }

    // Get ShipRocket's order ID from shipment record
    const shiprocketOrderId = (shipment as any).srOrderId || shipment.shippingRocketId;
    
    // Pass ShipRocket order ID to cancel
    const cancelResult = await this.shippingRocketService.cancelShipment(shiprocketOrderId);

    // Update shipment status
    shipment.status = ShipmentStatus.CANCELLED;
    await this.shipmentRepository.save(shipment);

    // Update order status
    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return { success: true, message: 'Shipment cancelled successfully' };
  }
}
