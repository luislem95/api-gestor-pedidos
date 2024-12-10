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

    console.log("Parámetros validados correctamente. Tipo:", tipo, "ID:", id, "ItemID:", itemId, "NuevaCantidad:", nuevaCantidad);

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

    // Actualizar la cantidad del ítem
    console.log("Actualizando cantidad del ítem:", currentCarrito[itemIndex]);
    currentCarrito[itemIndex].M.cantidad.N = nuevaCantidad.toString();
    console.log("Carrito después de actualizar:", currentCarrito);

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
    console.log("Actualización exitosa. Resultado:", JSON.stringify(result, null, 2));

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
