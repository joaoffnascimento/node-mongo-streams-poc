/* eslint-disable no-undef */
// Este script roda automaticamente quando o container inicia
db = db.getSiblingDB('streams_poc');

// Criar usuário específico para a aplicação
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [{ role: 'readWrite', db: 'streams_poc' }],
});

// Criar collections com configurações otimizadas
db.createCollection('documents', {
  // Configurações para simular limitações
  capped: false,
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'timestamp', 'value', 'category'],
      properties: {
        id: { bsonType: 'number' },
        timestamp: { bsonType: 'date' },
        value: { bsonType: 'number' },
        category: { enum: ['A', 'B', 'C', 'D'] },
      },
    },
  },
});

// Criar índices para otimização
db.documents.createIndex({ id: 1 }, { unique: true });
db.documents.createIndex({ category: 1, value: -1 });
db.documents.createIndex({ processed: 1 });

print('Database initialized successfully!');
