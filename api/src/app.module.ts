import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { SatService } from './sat.service';
import { TaxEngineService } from './tax-engine.service';
import { StatementParserService } from './statement-parser.service';
import { SatXmlService } from './sat-xml.service';
import { CurrencyService } from './currency.service';
import { AuditService } from './audit.service';
import { NominaController } from './nomina.controller';
import { PayrollService } from './payroll.service';
import { PayrollXmlService } from './payroll-xml.service';
import { PayrollTaxesService } from './payroll-taxes.service';
import { ProductsController } from './products.controller';
import { AccountsController } from './accounts.controller';
import { JournalsController } from './journals.controller';
import { ClientsController } from './clients.controller';
import { SuppliersController } from './suppliers.controller';
import { InvoicesController } from './invoices.controller';
import { BillsController } from './bills.controller';
import { BanksController } from './banks.controller';
import { PayrollController } from './payroll.controller';
import { AssetsController } from './assets.controller';
import { ReportsController } from './reports.controller';
import { DashboardController } from './dashboard.controller';
import { AuthController } from './auth.controller';
import { XmlSatController } from './xml-sat.controller';
import { SatExportsController } from './sat-exports.controller';
import { CurrencyController } from './currency.controller';
import { ReconciliationController } from './reconciliation.controller';
import { DiotController } from './diot.controller';
import { AutomationController } from './automation.controller';
import { AuditController } from './audit.controller';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';
import { ElectronicAccountingController } from './electronic-accounting.controller';
import { CompaniesController } from './companies.controller';
import { TaxController } from './tax.controller';
import { SatSyncController } from './sat-sync.controller';
import { SatDescargaService } from './sat-descarga.service';
import { SegmentsController } from './segments.controller';
import { BudgetsController } from './budgets.controller';
import { LogsController } from './logs.controller';
import { InventoryController } from './inventory.controller';
import { TreasuryController } from './treasury.controller';
import { TemplatesController } from './templates.controller';
import { SatController } from './sat.controller';
import { StampingController } from './stamping.controller';
import { CertificatesController } from './certificates.controller';
import { PaymentsController } from './payments.controller';
import { QuotesController } from './quotes.controller';
import { RetencionesController } from './retenciones.controller';
import { PosController } from './pos.controller';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { WarehousesController } from './warehouses.controller';
import { SerialsLotsController } from './serials-lots.controller';
import { PriceListsController } from './price-lists.controller';
import { ChecksController } from './checks.controller';
import { AdvancesController } from './advances.controller';
import { BranchesController } from './branches.controller';
import { SalespeopleController } from './salespeople.controller';
import { PermissionsController } from './permissions.controller';
import { ExportController } from './export.controller';
import { ImportController } from './import.controller';
import { StampingService } from './stamping.service';
import { TaxService } from './tax.service';
import { EmailService } from './email.service';
import { FinkokService } from './pac.service';
import { StripeService } from './stripe.service';
import { SubscriptionsController } from './subscriptions.controller';
import { IaModule } from './ia/ia.module';

@Module({
  imports: [IaModule],
  controllers: [
    ProductsController,
    AccountsController,
    JournalsController,
    ClientsController,
    SuppliersController,
    InvoicesController,
    BillsController,
    BanksController,
    PayrollController,
    AssetsController,
    ReportsController,
    DashboardController,
    AuthController,
    XmlSatController,
    SatExportsController,
    CurrencyController,
    ReconciliationController,
    DiotController,
    AutomationController,
    AuditController,
    FiscalController,
    NominaController,
    CompaniesController,
    TaxController,
    SatSyncController,
    SegmentsController,
    BudgetsController,
    LogsController,
    InventoryController,
    TreasuryController,
    TemplatesController,
    ElectronicAccountingController,
    SatController,
    StampingController,
    CertificatesController,
    PaymentsController,
    SubscriptionsController,
    QuotesController,
    RetencionesController,
    PosController,
    PurchaseOrdersController,
    WarehousesController,
    SerialsLotsController,
    PriceListsController,
    ChecksController,
    AdvancesController,
    BranchesController,
    SalespeopleController,
    PermissionsController,
    ExportController,
    ImportController,
  ],
  providers: [
    TaxService,
    PrismaService,
    SatService,
    TaxEngineService,
    StatementParserService,
    SatXmlService,
    CurrencyService,
    AuditService,
    PayrollService,
    PayrollXmlService,
    PayrollTaxesService,
    FiscalService,
    StampingService,
    FinkokService,
    EmailService,
    SatDescargaService,
    StripeService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
