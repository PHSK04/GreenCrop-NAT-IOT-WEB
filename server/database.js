const client = String(process.env.DB_CLIENT || 'postgres').trim().toLowerCase();

if (client === 'mssql' || client === 'sqlserver' || client === 'sql-server') {
    module.exports = require('./database_mssql');
} else {
    module.exports = require('./database_postgres');
}
