require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// Configuración del cliente DynamoDB
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

// Document Client simplificado
const ddbDocClient = DynamoDBDocumentClient.from(client);

module.exports = ddbDocClient;
