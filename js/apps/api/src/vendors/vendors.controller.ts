import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { VendorsService } from "./vendors.service";
import { BrowseVendorsQueryDto, CreateVendorDto, UpdateVendorDto } from "./vendors.dto";
import { VendorStatus } from "../database";

/**
 * Vendors REST API
 *
 * Public routes (no auth required):
 *   GET  /api/vendors              Browse approved vendors
 *   GET  /api/vendors/categories   List distinct categories for a city
 *   GET  /api/vendors/:id          Get a single approved vendor
 *
 * Member routes (vendor auth required — auth guard to be added):
 *   POST  /api/vendors             Create a vendor application
 *   PATCH /api/vendors/:id         Update own vendor profile
 *
 * Admin routes (admin auth required — auth guard to be added):
 *   GET   /api/vendors/admin/list  List all vendors (any status)
 *   PATCH /api/vendors/admin/:id/status  Approve / reject a vendor
 */
@Controller("api/vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  browse(@Query() query: BrowseVendorsQueryDto) {
    return this.vendorsService.browse(query);
  }

  @Get("categories")
  getCategories(@Query("citySlug") citySlug: string) {
    return this.vendorsService.getCategories(citySlug ?? "seattle");
  }

  // Admin routes must come before :id to avoid NestJS route shadowing
  @Get("admin/list")
  adminList(
    @Query("status") status: VendorStatus | undefined,
    @Query("page") page: string,
    @Query("limit") limit: string,
  ) {
    return this.vendorsService.adminList(status, Number(page) || 1, Number(limit) || 20);
  }

  @Patch("admin/:id/status")
  setStatus(
    @Param("id") id: string,
    @Body("status") status: VendorStatus,
  ) {
    return this.vendorsService.setStatus(id, status);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  // ─── Member (Vendor Self-Service) ─────────────────────────────────────────

  @Post()
  create(
    @Body() dto: CreateVendorDto,
    // TODO: replace with real auth guard — extract ownerId from JWT
    @Query("ownerId") ownerId: string,
  ) {
    return this.vendorsService.create(ownerId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
    // TODO: replace with real auth guard — extract ownerId from JWT
    @Query("ownerId") ownerId: string,
  ) {
    return this.vendorsService.update(id, ownerId, dto);
  }
}
