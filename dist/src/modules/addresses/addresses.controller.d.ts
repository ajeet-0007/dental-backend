import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
export declare class AddressesController {
    private readonly addressesService;
    constructor(addressesService: AddressesService);
    create(req: any, createAddressDto: CreateAddressDto): Promise<import("../../database/entities").Address>;
    findAll(req: any): Promise<import("../../database/entities").Address[]>;
    getDefault(req: any): Promise<import("../../database/entities").Address | null>;
    findOne(req: any, id: string): Promise<import("../../database/entities").Address>;
    update(req: any, id: string, updateAddressDto: UpdateAddressDto): Promise<import("../../database/entities").Address>;
    remove(req: any, id: string): Promise<void>;
}
