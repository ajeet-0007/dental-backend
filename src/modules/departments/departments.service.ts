import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department } from "../../database/entities";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto/department.dto";
import { slugify } from "../../common/utils/slugify";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
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
      .leftJoin("department.products", "product")
      .loadRelationCountAndMap("department.categoryCount", "department.categories")
      .loadRelationCountAndMap("department.productCount", "department.products")
      .orderBy("department.sortOrder", "ASC");

    if (activeOnly) {
      query.where("department.isActive = :isActive", { isActive: true });
    }

    return query.getMany();
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

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.findOne(id);

    if (updateDepartmentDto.name && updateDepartmentDto.name !== department.name) {
      updateDepartmentDto.slug =
        updateDepartmentDto.slug || slugify(updateDepartmentDto.name);
    }

    Object.assign(department, updateDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentRepository.remove(department);
  }
}
