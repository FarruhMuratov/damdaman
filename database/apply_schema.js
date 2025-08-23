const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Получаем переменные окружения Railway
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не найден в переменных окружения');
    console.log('Убедитесь, что вы находитесь в связанном Railway проекте');
    process.exit(1);
}

async function applySchema() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Подключаемся к базе данных PostgreSQL на Railway...');
        await client.connect();
        console.log('✅ Подключение успешно!');

        // Читаем SQL схему
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📖 Применяем схему базы данных...');
        await client.query(schemaSQL);
        
        console.log('✅ Схема успешно применена!');
        
        // Проверяем, что таблицы созданы
        console.log('🔍 Проверяем созданные таблицы...');
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Созданные таблицы:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Проверяем базовые данные
        console.log('🔍 Проверяем базовые данные...');
        const categoriesResult = await client.query('SELECT COUNT(*) as count FROM categories');
        const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
        
        console.log(`  - Категории туров: ${categoriesResult.rows[0].count}`);
        console.log(`  - Пользователи: ${usersResult.rows[0].count}`);

        console.log('🎉 База данных успешно настроена!');
        
    } catch (error) {
        console.error('❌ Ошибка при применении схемы:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Запускаем скрипт
applySchema();
