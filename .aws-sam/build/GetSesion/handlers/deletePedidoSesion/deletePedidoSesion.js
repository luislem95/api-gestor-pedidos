const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Manejar preflight
  if (event.httpMethod === "OPTIONS") {
    console.log("Preflight OPTIONS request manejada.");
    return {
      statusCode: 200,
      headers,
    };
  }

  try {
    console.log("Procesando solicitud...");

    const body = JSON.parse(event.body);
    console.log("Cuerpo de la solicitud:", body);

    const { tipo, id, itemId } = body;

    // Validar los parámetros necesarios
    if (!tipo || !id || !itemId) {
      console.log("Validación fallida: faltan parámetros.");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: "Todos los campos son requeridos: tipo, id, itemId.",
        }),
      };
    }

    console.log("Parámetros validados correctamente. Tipo:", tipo, "ID:", id, "ItemID:", itemId);

    // Obtener el carrito actual desde DynamoDB
    const getItemParams = {
      TableName: "general-storage",
      Key: {
        tipo: { S: tipo },
        id: { S: id },
      },
      ProjectionExpression: "carrito", // Solo obtenemos el carrito
    };

    console.log("Obteniendo carrito actual con parámetros:", getItemParams);

    const currentData = await dynamoDB.send(new GetItemCommand(getItemParams));
    console.log("Datos actuales obtenidos de DynamoDB:", JSON.stringify(currentData, null, 2));

    let currentCarrito = currentData.Item?.carrito?.L || [];
    console.log("Carrito actual:", currentCarrito);

    // Encontrar el índice del ítem específico
    const itemIndex = currentCarrito.findIndex((item) => item.M.id.S === itemId);
    console.log("Índice del ítem encontrado:", itemIndex);

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

    // Eliminar el ítem del carrito
    console.log("Eliminando ítem:", currentCarrito[itemIndex]);
    currentCarrito.splice(itemIndex, 1); // Eliminar el ítem

    console.log("Carrito después de eliminar:", currentCarrito);

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

    console.log("Enviando actualización a DynamoDB con parámetros:", updateParams);

    // Enviar el comando de actualización
    const result = await dynamoDB.send(new UpdateItemCommand(updateParams));
    console.log("Eliminación exitosa. Resultado:", JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Ítem eliminado con éxito",
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
        message: "Error al eliminar el ítem",
        error: error.message,
      }),
    };
  }
};
