import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department, Product } from "../../database/entities";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto/department.dto";
import { slugify } from "../../common/utils/slugify";
import { ImageKitService } from "../imagekit/imagekit.service";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private imageKitService: ImageKitService,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const slug = createDepartmentDto.slug || slugify(createDepartmentDto.name);

    const existingDepartment = await this.departmentRepository.findOne({
      where: { slug },
    });

    if (existingDepartment) {
      throw new ConflictException("Department with this slug already exists");
    }

    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      slug,
    });

    return this.departmentRepository.save(department);
  }

  async findAll(activeOnly = true): Promise<Department[]> {
    const query = this.departmentRepository
      .createQueryBuilder("department")
      .leftJoinAndSelect("department.categories", "categories")
      .orderBy("department.sortOrder", "ASC");

    if (activeOnly) {
      query.where("department.isActive = :isActive", { isActive: true });
    }

    const departments = await query.getMany();

    if (departments.length === 0) {
      return departments;
    }

    const departmentIds = departments.map((department) => department.id);

    const categoryCountRows: { departmentId: number; count: string }[] =
      await this.departmentRepository.manager
        .createQueryBuilder()
        .select("categoryDepartment.departmentId", "departmentId")
        .addSelect("COUNT(*)", "count")
        .from("category_departments", "categoryDepartment")
        .where("categoryDepartment.departmentId IN (:...departmentIds)", {
          departmentIds,
        })
        .groupBy("categoryDepartment.departmentId")
        .getRawMany();

    const productCountRows: { departmentId: number; count: string }[] =
      await this.departmentRepository.manager
        .createQueryBuilder()
        .select("productDepartment.departmentId", "departmentId")
        .addSelect("COUNT(DISTINCT productDepartment.productId)", "count")
        .from("product_departments", "productDepartment")
        .where("productDepartment.departmentId IN (:...departmentIds)", {
          departmentIds,
        })
        .groupBy("productDepartment.departmentId")
        .getRawMany();

    const categoryCounts = new Map<number, number>();
    for (const row of categoryCountRows) {
      categoryCounts.set(Number(row.departmentId), parseInt(String(row.count), 10) || 0);
    }

    const productCounts = new Map<number, number>();
    for (const row of productCountRows) {
      productCounts.set(Number(row.departmentId), parseInt(String(row.count), 10) || 0);
    }

    return departments.map((department) => ({
      ...department,
      categoryCount: categoryCounts.get(department.id) || 0,
      productCount: productCounts.get(department.id) || 0,
    }));
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["categories", "products"],
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  async findBySlug(slug: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { slug },
      relations: ["categories", "products"],
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  async getDepartmentDetails(slug: string): Promise<any> {
    const department = await this.findBySlug(slug);
    const productRepository =
      this.departmentRepository.manager.getRepository(Product);

    const stats = await productRepository
      .createQueryBuilder("product")
      .innerJoin("product.departments", "department")
      .select("COUNT(DISTINCT product.id)", "productCount")
      .addSelect("COUNT(DISTINCT product.categoryId)", "categoryCount")
      .addSelect("COUNT(DISTINCT product.brandId)", "brandCount")
      .addSelect("MIN(product.sellingPrice)", "minPrice")
      .addSelect("MAX(product.sellingPrice)", "maxPrice")
      .addSelect(
        "SUM(CASE WHEN product.isFeatured = 1 THEN 1 ELSE 0 END)",
        "featuredProductCount"
      )
      .where("department.slug = :slug", { slug })
      .andWhere("product.isActive = 1")
      .getRawOne();

    return {
      ...department,
      productCount: parseInt(stats?.productCount || 0, 10),
      categoryCount: parseInt(stats?.categoryCount || 0, 10),
      brandCount: parseInt(stats?.brandCount || 0, 10),
      minPrice: stats?.minPrice == null ? null : Number(stats.minPrice),
      maxPrice: stats?.maxPrice == null ? null : Number(stats.maxPrice),
      featuredProductCount: parseInt(stats?.featuredProductCount || 0, 10),
    };
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.findOne(id);

    if (updateDepartmentDto.name && updateDepartmentDto.name !== department.name) {
      updateDepartmentDto.slug =
        updateDepartmentDto.slug || slugify(updateDepartmentDto.name);
    }

    const previousImage = department.image;

    Object.assign(department, updateDepartmentDto);
    const savedDepartment = await this.departmentRepository.save(department);

    if (previousImage && previousImage !== savedDepartment.image) {
      await this.imageKitService.deleteFiles([previousImage]);
    }

    return savedDepartment;
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    const image = department.image;
    await this.departmentRepository.remove(department);
    await this.imageKitService.deleteFiles([image]);
  }
}
