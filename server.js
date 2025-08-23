const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Подробная диагностика переменных окружения
console.log('🔍 Диагностика переменных окружения:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН');
console.log('DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН');
console.log('PORT:', process.env.PORT || '3000 (по умолчанию)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'не задан');
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || 'не задан');
console.log('RAILWAY_PROJECT_NAME:', process.env.RAILWAY_PROJECT_NAME || 'не задан');
console.log('RAILWAY_SERVICE_NAME:', process.env.RAILWAY_SERVICE_NAME || 'не задан');

// Получаем переменные окружения Railway
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

// Если DATABASE_URL не найден, показываем понятную ошибку
if (!DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не найден в переменных окружения');
    console.log('🔧 Решение:');
    console.log('1. Убедитесь, что вы в связанном Railway проекте');
    console.log('2. Добавьте DATABASE_URL в переменные окружения сервиса damdaman');
    console.log('3. Или используйте локальный .env файл');
    console.log('');
    console.log('📊 Текущие переменные окружения:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL);
    console.log('PORT:', process.env.PORT);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
    console.log('RAILWAY_PROJECT_NAME:', process.env.RAILWAY_PROJECT_NAME);
    console.log('RAILWAY_SERVICE_NAME:', process.env.RAILWAY_SERVICE_NAME);
    
    // Не завершаем процесс, а показываем страницу с ошибкой
    app.get('/', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Damdaman Tour Platform - Ошибка конфигурации</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-100 min-h-screen">
                <div class="container mx-auto px-4 py-8">
                    <h1 class="text-3xl font-bold text-center mb-8 text-red-600">
                        🚨 Ошибка конфигурации
                    </h1>
                    
                    <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-semibold mb-4 text-red-600">❌ DATABASE_URL не найден</h2>
                        
                        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            <p><strong>Проблема:</strong> Сервер не может подключиться к базе данных</p>
                        </div>
                        
                        <h3 class="font-semibold mb-2">🔧 Решение:</h3>
                        <ol class="list-decimal list-inside space-y-2 mb-4">
                            <li>Убедитесь, что вы в связанном Railway проекте</li>
                            <li>Добавьте DATABASE_URL в переменные окружения сервиса damdaman</li>
                            <li>Или используйте локальный .env файл</li>
                        </ol>
                        
                        <h3 class="font-semibold mb-2">📊 Текущие переменные:</h3>
                        <div class="bg-gray-100 p-3 rounded text-sm">
                            <p><strong>DATABASE_URL:</strong> ${process.env.DATABASE_URL || 'не найден'}</p>
                            <p><strong>DATABASE_PUBLIC_URL:</strong> ${process.env.DATABASE_PUBLIC_URL || 'не найден'}</p>
                            <p><strong>PORT:</strong> ${process.env.PORT || '3000 (по умолчанию)'}</p>
                            <p><strong>NODE_ENV:</strong> ${process.env.NODE_ENV || 'не задан'}</p>
                            <p><strong>RAILWAY_ENVIRONMENT:</strong> ${process.env.RAILWAY_ENVIRONMENT || 'не задан'}</p>
                            <p><strong>RAILWAY_PROJECT_NAME:</strong> ${process.env.RAILWAY_PROJECT_NAME || 'не задан'}</p>
                            <p><strong>RAILWAY_SERVICE_NAME:</strong> ${process.env.RAILWAY_SERVICE_NAME || 'не задан'}</p>
                        </div>
                        
                        <h3 class="font-semibold mb-2 mt-4">🚀 Для Railway:</h3>
                        <p class="text-sm text-gray-600 mb-4">
                            В Railway Dashboard перейдите в сервис "damdaman" → "Variables" 
                            и добавьте переменную DATABASE_URL со значением:
                        </p>
                        <div class="bg-gray-100 p-3 rounded text-sm font-mono">
                            postgresql://postgres:oQMszjqJQaeDysjolzVTEzoRUmUanlyo@shuttle.proxy.rlwy.net:36434/railway
                        </div>
                        
                        <h3 class="font-semibold mb-2 mt-4">🔍 Диагностика:</h3>
                        <p class="text-sm text-gray-600 mb-4">
                            Если переменная уже добавлена, проверьте:
                        </p>
                        <ul class="list-disc list-inside text-sm text-gray-600 mb-4">
                            <li>Название переменной точно "DATABASE_URL" (без пробелов)</li>
                            <li>Значение скопировано полностью</li>
                            <li>Переменная добавлена в правильный сервис "damdaman"</li>
                            <li>Переменная добавлена в правильное окружение "production"</li>
                        </ul>
                    </div>
                </div>
            </body>
            </html>
        `);
    });
    
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`🌐 Откройте http://localhost:${PORT} в браузере`);
        console.log(`❌ Но DATABASE_URL не настроен - подключение к БД невозможно`);
    });
    
    return;
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
                    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        <p><strong>✅ DATABASE_URL настроен!</strong></p>
                        <p>Сервер готов к работе с базой данных</p>
                        <p class="text-sm mt-2">Значение: ${DATABASE_URL.substring(0, 50)}...</p>
                    </div>
                    
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
                                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
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
    console.log(`✅ DATABASE_URL найден: ${DATABASE_URL ? 'Да' : 'Нет'}`);
    if (DATABASE_URL) {
        console.log(`🔗 Подключение к: ${DATABASE_URL.substring(0, 50)}...`);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    if (client.connected) {
        await client.end();
    }
    process.exit(0);
});
