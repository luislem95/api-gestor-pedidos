const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Manejar preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { tipo, id, itemId, nuevaCantidad } = body;

    // Validar los parámetros necesarios
    if (!tipo || !id || !itemId || nuevaCantidad === undefined) {
      console.log("Validación fallida: faltan parámetros.");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: "Todos los campos son requeridos: tipo, id, itemId, nuevaCantidad.",
        }),
      };
    }
    // Obtener el carrito actual desde DynamoDB
    const getItemParams = {
      TableName: "general-storage",
      Key: {
        tipo: { S: tipo },
        id: { S: id },
      },
      ProjectionExpression: "carrito", // Solo obtenemos el carrito
    };

    const currentData = await dynamoDB.send(new GetItemCommand(getItemParams));

    let currentCarrito = currentData.Item?.carrito?.L || [];

    // Encontrar el índice del ítem específico
    const itemIndex = currentCarrito.findIndex((item) => item.M.id.S === itemId);

    if (itemIndex === -1) {
      console.log("El ítem especificado no existe en el carrito.");
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: "El ítem especificado no existe en el carrito.",
        }),
      };
    }

    // Actualizar la cantidad del ítem
    currentCarrito[itemIndex].M.cantidad.N = nuevaCantidad.toString();

    // Parámetros para actualizar DynamoDB
    const updateParams = {
      TableName: "general-storage",
      Key: {
        tipo: { S: tipo },
        id: { S: id },
      },
      UpdateExpression: `
        SET carrito = :updatedCarrito
      `,
      ExpressionAttributeValues: {
        ":updatedCarrito": { L: currentCarrito },
      },
      ReturnValues: "UPDATED_NEW",
    };
    // Enviar el comando de actualización
    const result = await dynamoDB.send(new UpdateItemCommand(updateParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Cantidad actualizada con éxito",
        updatedAttributes: result.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al procesar la solicitud:", {
      message: error.message,
      stack: error.stack,
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Error al actualizar el ítem",
        error: error.message,
      }),
    };
  }
};
