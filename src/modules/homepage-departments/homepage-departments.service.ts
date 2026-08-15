import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomepageDepartment, Department, Product } from "../../database/entities";
import { leanProductQuery } from "../../common/utils/lean-product";
import { CreateHomepageDepartmentDto, UpdateHomepageDepartmentDto } from "./dto/homepage-department.dto";

const PRODUCTS_PER_DEPARTMENT = 10;

@Injectable()
export class HomepageDepartmentsService {
  constructor(
    @InjectRepository(HomepageDepartment)
    private homepageDepartmentRepository: Repository<HomepageDepartment>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllForHome(): Promise<{ department: Department; products: Product[]; count: number }[]> {
    const sections = await this.homepageDepartmentRepository.find({
      where: { isActive: true },
      relations: ["department"],
      order: { sortOrder: "ASC", id: "ASC" },
    });

    const activeSections = sections.filter(
      (section) => section.department && section.department.isActive,
    );

    const departmentIds = activeSections.map((section) => section.departmentId);

    const productsByDepartment = new Map<number, Product[]>();
    const countsByDepartment = new Map<number, number>();

    if (departmentIds.length > 0) {
      const products = await leanProductQuery(
        this.productRepository
          .createQueryBuilder("product")
          .where("product.isActive = :isActive", { isActive: true })
          .andWhere(
            (qb) =>
              "product.id IN " +
              qb
                .subQuery()
                .select("productDepartment.productId")
                .from("product_departments", "productDepartment")
                .where("productDepartment.departmentId IN (:...departmentIds)", {
                  departmentIds,
                })
                .getQuery(),
          )
          .orderBy("product.isFeatured", "DESC")
          .addOrderBy("product.createdAt", "DESC"),
      ).getMany();

      const productsById = new Map<number, Product>();
      for (const product of products) {
        productsById.set(product.id, product);
      }

      const departmentProductRows: { productId: number; departmentId: number }[] =
        await this.productRepository.manager
          .createQueryBuilder()
          .select("productDepartment.productId", "productId")
          .addSelect("productDepartment.departmentId", "departmentId")
          .from("product_departments", "productDepartment")
          .where("productDepartment.departmentId IN (:...departmentIds)", {
            departmentIds,
          })
          .getRawMany();

      for (const row of departmentProductRows) {
        const product = productsById.get(Number(row.productId));
        if (!product) continue;
        const list = productsByDepartment.get(Number(row.departmentId)) || [];
        list.push(product);
        productsByDepartment.set(Number(row.departmentId), list);
      }

      for (const [departmentId, list] of productsByDepartment) {
        list.sort(
          (a, b) =>
            Number(b.isFeatured) - Number(a.isFeatured) ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        );
        productsByDepartment.set(departmentId, list);
      }

      const countRows: { departmentId: number; count: string }[] =
        await this.productRepository
          .createQueryBuilder("product")
          .innerJoin("product.departments", "departments")
          .select("departments.id", "departmentId")
          .addSelect("COUNT(DISTINCT product.id)", "count")
          .where("product.isActive = :isActive", { isActive: true })
          .andWhere("departments.id IN (:...departmentIds)", { departmentIds })
          .groupBy("departments.id")
          .getRawMany();

      for (const row of countRows) {
        countsByDepartment.set(
          Number(row.departmentId),
          parseInt(String(row.count), 10) || 0,
        );
      }
    }

    return activeSections.map((section) => ({
      department: section.department,
      products:
        (productsByDepartment.get(section.departmentId) || []).slice(0, PRODUCTS_PER_DEPARTMENT),
      count: countsByDepartment.get(section.departmentId) || 0,
    }));
  }

  async findAllForAdmin(): Promise<HomepageDepartment[]> {
    return this.homepageDepartmentRepository.find({
      relations: ["department"],
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  async create(createHomepageDepartmentDto: CreateHomepageDepartmentDto): Promise<HomepageDepartment> {
    const department = await this.departmentRepository.findOne({
      where: { id: createHomepageDepartmentDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    const existing = await this.homepageDepartmentRepository.findOne({
      where: { departmentId: createHomepageDepartmentDto.departmentId },
    });

    if (existing) {
      throw new ConflictException("This department is already configured on the homepage");
    }

    const section = this.homepageDepartmentRepository.create(createHomepageDepartmentDto);
    return this.homepageDepartmentRepository.save(section);
  }

  async update(
    id: string,
    updateHomepageDepartmentDto: UpdateHomepageDepartmentDto,
  ): Promise<HomepageDepartment> {
    const section = await this.homepageDepartmentRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["department"],
    });

    if (!section) {
      throw new NotFoundException("Homepage department not found");
    }

    if (updateHomepageDepartmentDto.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: updateHomepageDepartmentDto.departmentId },
      });

      if (!department) {
        throw new NotFoundException("Department not found");
      }

      if (updateHomepageDepartmentDto.departmentId !== section.departmentId) {
        const existing = await this.homepageDepartmentRepository.findOne({
          where: { departmentId: updateHomepageDepartmentDto.departmentId },
        });

        if (existing) {
          throw new ConflictException("This department is already configured on the homepage");
        }
      }
    }

    Object.assign(section, updateHomepageDepartmentDto);
    return this.homepageDepartmentRepository.save(section);
  }

  async remove(id: string): Promise<void> {
    const section = await this.homepageDepartmentRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!section) {
      throw new NotFoundException("Homepage department not found");
    }

    await this.homepageDepartmentRepository.remove(section);
  }
}
