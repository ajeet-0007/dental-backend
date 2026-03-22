"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: 'mysql-273847d1-as1911018-cea6.f.aivencloud.com',
    port: 27873,
    username: 'avnadmin',
    password: 'AVNS_IGYST4u2H1WpZ0s7mf4',
    database: 'defaultdb',
    synchronize: false,
});
async function fixInventory() {
    await dataSource.initialize();
    console.log('Connected to database');
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
        const products = await queryRunner.query('SELECT id FROM products');
        console.log(`Found ${products.length} products`);
        await queryRunner.query('DELETE FROM inventory');
        console.log('Deleted existing inventory');
        for (const prod of products) {
            await queryRunner.query('INSERT INTO inventory (productId, quantity, reservedQuantity, lowStockThreshold, trackInventory, createdAt, updatedAt) VALUES (?, ?, 0, 10, 1, NOW(), NOW())', [prod.id, 50 + Math.floor(Math.random() * 100)]);
        }
        console.log('Inventory recreated with correct product IDs');
    }
    finally {
        await queryRunner.release();
        await dataSource.destroy();
    }
}
fixInventory().catch(console.error);
//# sourceMappingURL=fix-inventory.js.map