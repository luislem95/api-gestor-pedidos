const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const s3 = new S3Client({ region: "us-east-1" });
const dynamoDbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

const bucketName = "clarosv-store";
const folderName = "tienda-pedidos/";

exports.handler = async (event) => {
  console.log("Event received:", event);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  try {
    const { image, fileName, record } = JSON.parse(event.body);

    if (!image || !fileName || !record || !record.tipo || !record.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Faltan datos en la solicitud" }),
      };
    }

    // Decodificar la imagen Base64
    const buffer = Buffer.from(image, "base64");
    const filePath = `${folderName}${Date.now()}_${fileName}.jpg`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: buffer,
      ContentType: "image/jpeg",
    });

    // Subir el archivo al bucket
    await s3.send(command);

    const url = `s3://${bucketName}/${filePath}`;

    // Actualizar la tabla DynamoDB
    const updateParams = {
      TableName: "general-storage",
      Key: {
        tipo: record.tipo,
        id: record.id,
      },
      UpdateExpression: `
        SET comprobante = :comprobante,
            #estatus = :estatus
      `,
      ExpressionAttributeNames: {
        "#estatus": "estatus", // Alias para el nombre del campo "estatus"
      },
      ExpressionAttributeValues: {
        ":comprobante": url, // URL generada para la imagen
        ":estatus": "Facturacion", // Nuevo estado
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateResult = await dynamoDb.send(new UpdateCommand(updateParams));
    console.log("DynamoDB update result:", updateResult);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Archivo subido y actualizado correctamente",
        comprobante: url,
        dynamoResult: updateResult.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al subir la imagen o actualizar la tabla:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Error en el proceso", error: error.message }),
    };
  }
};