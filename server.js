const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Получаем переменные окружения Railway
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не найден в переменных окружения');
    console.log('Убедитесь, что вы находитесь в связанном Railway проекте');
    process.exit(1);
}

// Создаем клиент PostgreSQL
const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(express.json());
app.use(express.static('.')); // Раздаем статические файлы

// Маршрут для применения схемы
app.post('/api/apply-schema', async (req, res) => {
    try {
        console.log('🔌 Подключаемся к базе данных PostgreSQL на Railway...');
        await client.connect();
        console.log('✅ Подключение успешно!');

        // Читаем SQL схему
        const schemaPath = path.join(__dirname, 'database', 'apply_schema.sql');
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
        
        const tables = result.rows.map(row => row.table_name);
        
        // Проверяем базовые данные
        const categoriesResult = await client.query('SELECT COUNT(*) as count FROM categories');
        const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
        
        res.json({
            success: true,
            message: 'Схема успешно применена!',
            tables: tables,
            stats: {
                categories: categoriesResult.rows[0].count,
                users: usersResult.rows[0].count
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка при применении схемы:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Маршрут для проверки статуса БД
app.get('/api/db-status', async (req, res) => {
    try {
        if (!client.connected) {
            await client.connect();
        }
        
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        res.json({
            connected: true,
            tables: result.rows.map(row => row.table_name)
        });
        
    } catch (error) {
        res.json({
            connected: false,
            error: error.message
        });
    }
});

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Damdaman Tour Platform - Настройка БД</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 min-h-screen">
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold text-center mb-8 text-blue-600">
                    🗄️ Настройка базы данных Damdaman Tour Platform
                </h1>
                
                <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">📊 Статус базы данных</h2>
                    <div id="dbStatus" class="mb-6">
                        <p class="text-gray-600">Проверяем подключение...</p>
                    </div>
                    
                    <h2 class="text-xl font-semibold mb-4">🚀 Применить схему</h2>
                    <button id="applySchema" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        Применить схему БД
                    </button>
                    
                    <div id="result" class="mt-4"></div>
                </div>
            </div>
            
            <script>
                // Проверяем статус БД
                async function checkDBStatus() {
                    try {
                        const response = await fetch('/api/db-status');
                        const data = await response.json();
                        
                        const statusDiv = document.getElementById('dbStatus');
                        if (data.connected) {
                            statusDiv.innerHTML = \`
                                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                    ✅ База данных подключена
                                    <br>Таблиц: \${data.tables.length}
                                </div>
                            \`;
                        } else {
                            statusDiv.innerHTML = \`
                                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    ❌ Ошибка подключения: \${data.error}
                                </div>
                            \`;
                        }
                    } catch (error) {
                        document.getElementById('dbStatus').innerHTML = \`
                            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                ❌ Ошибка: \${error.message}
                            </div>
                        \`;
                    }
                }
                
                // Применяем схему
                async function applySchema() {
                    const button = document.getElementById('applySchema');
                    const resultDiv = document.getElementById('result');
                    
                    button.disabled = true;
                    button.textContent = 'Применяем схему...';
                    resultDiv.innerHTML = '<p class="text-blue-600">⏳ Применяем схему базы данных...</p>';
                    
                    try {
                        const response = await fetch('/api/apply-schema', { method: 'POST' });
                        const data = await response.json();
                        
                        if (data.success) {
                            resultDiv.innerHTML = \`
                                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                    <h3 class="font-bold">✅ Схема успешно применена!</h3>
                                    <p>Созданные таблицы: \${data.tables.join(', ')}</p>
                                    <p>Категории: \${data.stats.categories}, Пользователи: \${data.stats.users}</p>
                                </div>
                            \`;
                        } else {
                            resultDiv.innerHTML = \`
                                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    <h3 class="font-bold">❌ Ошибка:</h3>
                                    <p>\${data.error}</p>
                                </div>
                            \`;
                        }
                    } catch (error) {
                        resultDiv.innerHTML = \`
                            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                <h3 class="font-bold">❌ Ошибка:</h3>
                                <p>\${error.message}</p>
                            </div>
                        \`;
                    } finally {
                        button.disabled = false;
                        button.textContent = 'Применить схему БД';
                        checkDBStatus(); // Обновляем статус
                    }
                }
                
                // Инициализация
                document.addEventListener('DOMContentLoaded', () => {
                    checkDBStatus();
                    document.getElementById('applySchema').addEventListener('click', applySchema);
                });
            </script>
        </body>
        </html>
    `);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Откройте http://localhost:${PORT} в браузере`);
    console.log(`📊 Статус БД: http://localhost:${PORT}/api/db-status`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    if (client.connected) {
        await client.end();
    }
    process.exit(0);
});
